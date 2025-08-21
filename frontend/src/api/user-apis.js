import axios from 'axios';

const API_URL = 'http://localhost:8000';


export const login = async ({ username, password, role }) => {
  const res = await axios.post(
    `${API_URL}/users/login`,
    {
      username,
      password,
      role, // role is added here
    },
    {
      headers: {
        'Content-Type': 'application/json',  // JSON format for body
      }
    }
  );

  return res.data;
};


export const logout = async (token) => {
  return await axios.post(`${API_URL}/users/logout`, null, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};