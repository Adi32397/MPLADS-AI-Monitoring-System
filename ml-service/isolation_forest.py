"""
Pure NumPy implementation of Isolation Forest.
Used as a resilient drop-in replacement when scikit-learn / scipy C-extensions (.pyd)
are blocked by Windows Smart App Control (SAC) or Code Integrity policies.
"""

import numpy as np
import pandas as pd


def _c_factor(n):
    """Average path length of unsuccessful search in BST."""
    if n <= 1:
        return 0.0
    if n == 2:
        return 1.0
    return 2.0 * (np.log(n - 1) + 0.5772156649) - (2.0 * (n - 1) / float(n))


class _Node:
    __slots__ = ('is_leaf', 'size', 'split_feature', 'split_value', 'left', 'right')

    def __init__(self, is_leaf=False, size=0, split_feature=None, split_value=None, left=None, right=None):
        self.is_leaf = is_leaf
        self.size = size
        self.split_feature = split_feature
        self.split_value = split_value
        self.left = left
        self.right = right


def _build_itree(X, current_depth, depth_limit, rng):
    n_samples, n_features = X.shape
    if current_depth >= depth_limit or n_samples <= 1:
        return _Node(is_leaf=True, size=n_samples)

    # Find candidate features with non-constant values
    feature_indices = rng.permutation(n_features)
    split_feat = None
    min_val = max_val = 0.0

    for feat in feature_indices:
        col = X[:, feat]
        feat_min, feat_max = np.min(col), np.max(col)
        if feat_min < feat_max:
            split_feat = feat
            min_val = feat_min
            max_val = feat_max
            break

    # If all features are constant in this subsample, create leaf
    if split_feat is None:
        return _Node(is_leaf=True, size=n_samples)

    split_val = rng.uniform(min_val, max_val)
    left_mask = X[:, split_feat] < split_val
    right_mask = ~left_mask

    # If split didn't separate anything, force leaf
    if not np.any(left_mask) or not np.any(right_mask):
        return _Node(is_leaf=True, size=n_samples)

    left_child = _build_itree(X[left_mask], current_depth + 1, depth_limit, rng)
    right_child = _build_itree(X[right_mask], current_depth + 1, depth_limit, rng)

    return _Node(
        is_leaf=False,
        split_feature=split_feat,
        split_value=split_val,
        left=left_child,
        right=right_child
    )


def _path_length(x, node, current_depth=0):
    if node.is_leaf:
        return current_depth + _c_factor(node.size)

    if x[node.split_feature] < node.split_value:
        return _path_length(x, node.left, current_depth + 1)
    else:
        return _path_length(x, node.right, current_depth + 1)


class IsolationForest:
    """
    Lightweight Isolation Forest with scikit-learn compatible interface.
    """
    def __init__(self, n_estimators=100, max_samples='auto', contamination=0.1, random_state=42):
        self.n_estimators = n_estimators
        self.max_samples = max_samples
        self.contamination = contamination
        self.random_state = random_state
        self.trees_ = []
        self.subsample_size_ = 0
        self.threshold_ = 0.0

    def fit(self, X, y=None):
        if isinstance(X, pd.DataFrame):
            X_arr = X.to_numpy(dtype=np.float64)
        else:
            X_arr = np.asarray(X, dtype=np.float64)

        n_samples, _ = X_arr.shape
        rng = np.random.RandomState(self.random_state)

        if self.max_samples == 'auto':
            self.subsample_size_ = min(256, n_samples)
        elif isinstance(self.max_samples, (int, np.integer)):
            self.subsample_size_ = min(self.max_samples, n_samples)
        elif isinstance(self.max_samples, float):
            self.subsample_size_ = max(1, int(self.max_samples * n_samples))
        else:
            self.subsample_size_ = min(256, n_samples)

        depth_limit = int(np.ceil(np.log2(max(self.subsample_size_, 2))))
        self.trees_ = []

        for _ in range(self.n_estimators):
            # Subsample rows
            if n_samples <= self.subsample_size_:
                subsample = X_arr
            else:
                indices = rng.choice(n_samples, size=self.subsample_size_, replace=False)
                subsample = X_arr[indices]

            tree = _build_itree(subsample, current_depth=0, depth_limit=depth_limit, rng=rng)
            self.trees_.append(tree)

        # Compute decision threshold based on training samples
        scores = self.score_samples(X_arr)
        if self.contamination is not None and self.contamination > 0:
            self.threshold_ = np.percentile(scores, 100.0 * self.contamination)
        else:
            self.threshold_ = -0.5

        return self

    def score_samples(self, X):
        """
        Opposite of the anomaly score defined in the original paper.
        Lower values correspond to higher anomalies (scikit-learn convention).
        """
        if isinstance(X, pd.DataFrame):
            X_arr = X.to_numpy(dtype=np.float64)
        else:
            X_arr = np.asarray(X, dtype=np.float64)

        n_samples = X_arr.shape[0]
        if n_samples == 0:
            return np.array([])

        c_subsample = _c_factor(self.subsample_size_)
        if c_subsample <= 0:
            c_subsample = 1.0

        total_paths = np.zeros(n_samples, dtype=np.float64)
        for i in range(n_samples):
            row = X_arr[i]
            sample_paths = sum(_path_length(row, tree) for tree in self.trees_)
            total_paths[i] = sample_paths / len(self.trees_)

        # Standard score: 2 ** (-E(h) / c(n))
        anomaly_scores = 2.0 ** (- (total_paths / c_subsample))

        # Scikit-learn score_samples convention: - anomaly_score
        return - anomaly_scores

    def decision_function(self, X):
        """Anomaly score offset so negative values are anomalies."""
        return self.score_samples(X) - self.threshold_

    def predict(self, X):
        """
        Predict if a particular sample is an outlier or not.
        Returns:
            -1 for outliers / anomalies
             1 for inliers / normal
        """
        scores = self.score_samples(X)
        predictions = np.ones(len(scores), dtype=int)
        predictions[scores <= self.threshold_] = -1
        return predictions
