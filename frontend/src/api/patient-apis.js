import axios from 'axios';

const API_URL = 'http://localhost:8000';

//Patient dashboard APIs
export const getPatientInfo = async (token) => {
  const res = await axios.get(`${API_URL}/patients/patient/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
};


export const uploadImage = async (files) => {
  const formData = new FormData();

  // Loop through each image and append each to FormData
  files.forEach(file => {
    formData.append('files', file);
  });

  try {
    const res = await axios.post(`${API_URL}/patients/upload-image/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Ensure the correct content type
      },
    });

    return res.data; // return the response with the image paths
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};



export const submitSymptom = async (symptom, token) => {
  token = token || localStorage.getItem('token');
  if (!token) {
    throw new Error('No token provided');
  }
  const res = await axios.post(`${API_URL}/patients/symptoms/`, symptom, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data;
};

export const getSymptomHistory = async (token, status = null, startDate = null, endDate = null) => {
  const params = {};
  if (status && status !== 'all') params.status = status;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  try {
    const res = await axios.get(`${API_URL}/patients/symptoms-history/`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    }
    );
    return res.data;
  } catch (error) {
    console.error('Failed to fetch symptom history', error);
    throw error;
  }
};


export const getSymptom = async (symptom_id, token) => {
  const res = await axios.get(`${API_URL}/patients/symptom/${symptom_id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
};
