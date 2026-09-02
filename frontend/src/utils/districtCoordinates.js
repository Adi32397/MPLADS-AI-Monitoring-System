export const DISTRICT_COORDINATES = {
  "Agra": [27.1767, 78.0081],
  "Ajmer": [26.4499, 74.6399],
  "Aurangabad": [19.8762, 75.3433],
  "Bhagalpur": [25.2425, 87.0125],
  "Dehradun": [30.3165, 78.0322],
  "Gaya": [24.7914, 85.0002],
  "Haridwar": [29.9457, 78.1642],
  "Jaipur": [26.9124, 75.7873],
  "Jodhpur": [26.2389, 73.0243],
  "Kota": [25.2138, 75.8648],
  "Lucknow": [26.8467, 80.9462],
  "Meerut": [28.9845, 77.7064],
  "Muzaffarpur": [26.1197, 85.3910],
  "Nagpur": [21.1458, 79.0882],
  "Nainital": [29.3919, 79.4542],
  "Nalanda": [25.2017, 85.5186],
  "Nashik": [20.0110, 73.7903],
  "Patna": [25.5941, 85.1376],
  "Pauri Garhwal": [30.1456, 78.7758],
  "Prayagraj": [25.4358, 81.8463],
  "Pune": [18.5204, 73.8567],
  "Thane": [19.2183, 72.9781],
  "Udaipur": [24.5854, 73.6815],
  "Udham Singh Nagar": [28.9840, 79.4086],
  "Varanasi": [25.3176, 82.9739],
  "Almora": [29.5892, 79.6467],
  "Bhopal": [23.2599, 77.4126],
  "Bengaluru Urban": [12.9716, 77.5946],
  "Bhubaneswar": [20.2961, 85.8245],
  "Kolkata": [22.5726, 88.3639],
  "Kanpur Nagar": [26.4499, 80.3319],
  "Chennai": [13.0827, 80.2707]
};

// Simple string hash to generate a consistent float between min and max
function stringToFloat(str, min, max) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const normalized = (Math.abs(hash) % 10000) / 10000;
  return min + (normalized * (max - min));
}

// Get coordinates for a district, generating a fallback if not explicitly defined
export const getDistrictCoordinates = (districtName) => {
  if (DISTRICT_COORDINATES[districtName]) {
    return DISTRICT_COORDINATES[districtName];
  }
  
  // Generate a consistent pseudo-random location in central India
  const lat = stringToFloat(districtName, 20.0, 28.0);
  const lng = stringToFloat(districtName + "_lng", 74.0, 84.0);
  
  // Save it so it's consistent in this session
  DISTRICT_COORDINATES[districtName] = [lat, lng];
  return [lat, lng];
};
