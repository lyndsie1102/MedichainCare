import axios from 'axios';

const API_URL = 'http://localhost:8000'; // adjust if needed

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post(`${API_URL}/upload-image/`, formData);
  return res.data;
};

export const submitSymptom = async (symptom) => {
  const res = await axios.post(`${API_URL}/symptoms/`, symptom);
  return res.data;
};

export const getSymptomHistory = async (patientId) => {
  const res = await axios.get(`${API_URL}/symptoms/history/${patientId}`);
  return res.data;
};
