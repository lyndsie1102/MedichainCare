import axios from 'axios';

const API_URL = 'http://localhost:8000';

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

//Patient dashboard APIs
export const getPatientInfo = async (token) => {
  const res = await axios.get(`${API_URL}/patient/me`, {
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
    const res = await axios.post(`${API_URL}/upload-image/`, formData, {
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
  if(!token) {
    throw new Error('No token provided');
  }
  const res = await axios.post(`${API_URL}/symptoms/`, symptom, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data;
};

export const getSymptomHistory = async (token) => {
  const res = await axios.get(`${API_URL}/symptoms-history/`, {
    headers: {
      Authorization: `Bearer ${token}`, 
      'Content-Type': 'application/json'
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

export const getTestTypes = async (token) => {
  const res = await axios.get(`${API_URL}/test-types/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data;
};