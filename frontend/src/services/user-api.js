import axiosInstance from "./api";

export async function sendOtp({ email, phoneNumber, phoneSuffix }) {
  try {
    const res = await axiosInstance.post("/auth/send-otp", {
      email,
      phoneNumber,
      phoneSuffix,
    });
    return res.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
}

export async function verifyOtp(payload) {
  try {
    const res = await axiosInstance.post("/auth/verify-otp", payload);
    return res.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
}

export async function updateUserProfile(updateData) {
  try {
    const res = await axiosInstance.put("/auth/update-profile", updateData);
    return res.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
}

export async function checkUserAuth() {
  try {
    const res = await axiosInstance.get("/auth/check-auth");
    if (res.data.status === "success") {
      return { isAuthentication: true, user: res?.data?.data };
    } else if (res.data.status === "error") return { isAuthentication: false };
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
}

export async function logoutUser() {
  try {
    const res = await axiosInstance.get("/auth/logout");
    return res.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
}

export async function getAllUsers() {
  try {
    const res = await axiosInstance.get("/auth/users");
    return res.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message; // ✅ fixed: was error.res
  }
}

export async function googleLoginApi(data) {
  try {
    const res = await axiosInstance.post("/auth/google-login", data);
    return res.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
}
