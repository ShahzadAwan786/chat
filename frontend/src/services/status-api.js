import axiosInstance from "./api";

export async function fetchStatuses() {
  try {
    const res = await axiosInstance.get("/status");
    return res.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
}

export async function createStatus(formData) {
  try {
    const res = await axiosInstance.post("/status", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
}

export async function viewStatusApi(statusId) {
  try {
    const res = await axiosInstance.put(`/status/${statusId}/view`);
    return res.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
}

export async function deleteStatusApi(statusId) {
  try {
    const res = await axiosInstance.delete(`/status/${statusId}`);
    return res.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
}
