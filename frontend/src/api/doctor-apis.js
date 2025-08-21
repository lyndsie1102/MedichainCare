import axios from 'axios';

const API_URL = 'http://localhost:8000';

//Doctor dasboard APIs
export const getDoctorDashboard = async (token, status = null, search = null) => {
  const params = {};
  if (status && status !== 'all') params.status = status;
  if (search) params.search = search;

  const res = await axios.get(`${API_URL}/doctors/doctor-dashboard/`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    params
  });

  return res.data;
};

export const getDoctorDetails = async (token) => {
  const res = await axios.get(`${API_URL}/doctors/doctor/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
};

export const getSymptomDetails = async (symptomId, token) => {
  const res = await axios.get(`${API_URL}/doctors/symptom_details/${symptomId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
};

export const createDiagnosis = async (diagnosisData, token) => {
  const res = await axios.post(`${API_URL}/doctors/create_diagnosis/`, diagnosisData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data;
};


export const getMedicalLabs = async (token) => {
  const res = await axios.get(`${API_URL}/doctors/medical-labs/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data;
};


export const getAllDoctors = async (token) => {
  const res = await axios.get(`${API_URL}/doctors/doctors`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data;
}


export const createReferral = async (token, symptomId, doctorId) => {
  const res = await axios.post(
    `${API_URL}/doctors/refer`,
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
  const res = await axios.get(`${API_URL}/doctors/test-types/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data;
};

export const createTestRequest = async (token, payload) => {
  try {
    const res = await axios.post(`${API_URL}/doctors/assign-lab/`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    return res.data;
  } catch (error) {
    console.error('Error creating test request:', error);
    throw error;
  }
};