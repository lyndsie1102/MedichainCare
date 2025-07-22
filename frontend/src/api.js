import axios from 'axios';

const API_URL = 'http://localhost:8000';

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

export const login = async ({ username, password }) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);

  const res = await axios.post(`${API_URL}/login`, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return res.data;
};


//Doctor dasboard APIs
export const getDoctorDashboard = async (token, status = null, search = null) => {
  const params = {};
  if (status) params.status = status;
  if (search) params.search = search;

  const res = await axios.get(`${API_URL}/doctor-dashboard/`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    params
  });

  return res.data;
};

export const getDoctorDetails = async (token) => {
  const res = await axios.get(`${API_URL}/doctor/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
};

export const getSymptomDetails = async (symptomId, token) => {
  const res = await axios.get(`${API_URL}/symptom_details/${symptomId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
};

export const createDiagnosis = async (diagnosisData, token) => {
  const res = await axios.post(`${API_URL}/create_diagnosis/`, diagnosisData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data;
};


export const getMedicalLabs = async (token) => {
  const res = await axios.get(`${API_URL}/medical-labs/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data;
};


export const getAllDoctors = async (token) => {
   const res = await axios.get(`${API_URL}/doctors/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data;
}


export const createReferral = async (token, symptomId, doctorId) => {
  const res = await axios.post(
    `${API_URL}/refer`,
    {
      symptom_id: symptomId,
      referral_doctor_id: doctorId
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return res.data;
};