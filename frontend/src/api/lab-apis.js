import axios from 'axios';

const API_URL = 'http://localhost:8000';

//Lab dashboard API
export const getLabStaffInfo = async (token) => {
  const res = await axios.get(`${API_URL}/labs/lab-staff/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
};

export const getTestRequests = async (token) => {
  const res = await axios.get(`${API_URL}/labs/test-requests/`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data;
};


export const uploadLabResult = async (upload_token, access_token, files, summary) => {
  const formData = new FormData();

  // Ensure files are iterable (FileList or Array)
  if (files.length === 0) {
    throw new Error("No files selected.");
  }

  files.forEach((file) => {
    formData.append("files", file);  // Use the correct key name
  });

  // Append the summary to the form data
  if (summary) {
    formData.append("summary", summary);  // Include the summary
  }

  try {
    const res = await axios.post(`${API_URL}/labs/lab/upload/${upload_token}`, formData, {
      headers: {
        Authorization: `Bearer ${access_token}`,  // Bearer token for authorization
        "Content-Type": "multipart/form-data",
      }
    });

    if (res.status === 200) {
      return res.data;
    } else {
      throw new Error(`Failed to upload. Status: ${res.status}`);
    }
  } catch (error) {
    throw new Error(error.response ? error.response.data.message : "Failed to upload lab results");
  }
};

//Appointment Schedule API
export const appointmentSchedule = async (testRequestId, date, time, token) => {
  const response = await axios.post(
    `${API_URL}/labs/appointments/${testRequestId}/schedule`,
    null,
    {
      params: { date, time },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

//Cancel appointment schedule API
export const cancelAppointment = async (appointmentId, token) => {
  const res = await axios.post(
    `${API_URL}/labs/appointments/${appointmentId}/cancel`,
    null,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
  return res.data;
}