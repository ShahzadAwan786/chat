import React, { useState } from "react";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import useLoginStore from "../../store/use-login-store";
import countries from "../../utils/countries";
import { avatars } from "../../utils/data";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import useThemeStore from "../../store/use-theme-store";
import { FaArrowLeft, FaChevronDown, FaPlus, FaWhatsapp } from "react-icons/fa";
import { motion } from "framer-motion";
import useUserStore from "../../store/use-user-store";
import { IoPerson } from "react-icons/io5";
import Spinner from "../../utils/spinner";
import { sendOtp, updateUserProfile, verifyOtp } from "../../services/user-api";
import { toast } from "react-toastify";

/* ---------------- VALIDATION ---------------- */

const loginValidationSchema = yup
  .object()
  .shape({
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^\d+$/, "Phone number must be digits")
      .transform((v, o) => (o.trim() === "" ? null : v)),

    email: yup
      .string()
      .nullable()
      .notRequired()
      .email("Please enter valid email")
      .transform((v, o) => (o.trim() === "" ? null : v)),
  })
  .test(
    "at-least-one",
    "Either email or phoneNumber is required",
    (value) => !!(value.phoneNumber || value.email),
  );

const otpValidationSchema = yup.object().shape({
  otp: yup.string().length(6, "OTP must be exactly 6 digits").required(),
});

const profileValidationSchema = yup.object().shape({
  username: yup.string().required("Username is required"),
  agreed: yup.bool().oneOf([true], "You must agree"),
});

/* ---------------- COMPONENT ---------------- */

export default function LogIn() {
  const { step, userPhoneData, setStep, setUserPhoneData, resetLoginState } =
    useLoginStore();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [selectedCountry, setSelectedCountry] = useState(countries[15]);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [selectedAvatar] = useState(avatars[4]);
  const [error, setError] = useState("");
  const [showDropDown, setShowDropDown] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const navigation = useNavigate();
  const { setUser } = useUserStore();
  const { theme } = useThemeStore();

  /* ---------------- FORMS ---------------- */

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm({ resolver: yupResolver(loginValidationSchema) });

  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue,
  } = useForm({ resolver: yupResolver(otpValidationSchema) });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    watch,
  } = useForm({ resolver: yupResolver(profileValidationSchema) });

  /* ---------------- LOGIC ---------------- */

  const onLoginSubmit = async (data) => {
    try {
      setLoading(true);
      setError("");

      const payload = data.email
        ? { email: data.email, phoneNumber: null, phoneSuffix: null }
        : {
            email: null,
            phoneNumber: data.phoneNumber,
            phoneSuffix: selectedCountry.dialCode,
          };

      const res = await sendOtp(payload);

      if (res?.status === "success") {
        toast.info("OTP sent");
        setUserPhoneData(payload);
        setStep(2);
      }
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async () => {
    try {
      setLoading(true);
      setError("");

      const otpString = otp.join("");

      const payload = userPhoneData.email
        ? { email: userPhoneData.email, otp: otpString }
        : {
            phoneNumber: userPhoneData.phoneNumber,
            phoneSuffix: userPhoneData.phoneSuffix,
            otp: otpString,
          };

      const res = await verifyOtp(payload);

      if (res?.status === "success") {
        const user = res.data?.user;
        const token = res.data?.token;

        toast.success("OTP verified");

        if (token && token !== "undefined") {
          localStorage.setItem("auth-token", token);
        }

        if (user?.userName && user?.profilePicture) {
          setUser(user);
          navigation("/");
          resetLoginState();
        } else {
          setStep(3);
        }
      } else {
        setError(res?.message || "Invalid OTP");
      }
    } catch (err) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfilePictureFile(file);
    setProfilePicture(URL.createObjectURL(file));
  };

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("agreed", data.agreed);

      if (profilePictureFile) {
        formData.append("media", profilePictureFile);
      } else {
        formData.append("profilePicture", selectedAvatar);
      }

      await updateUserProfile(formData);

      toast.success("Welcome!");
      navigation("/");
      resetLoginState();
    } catch (err) {
      setError(err.message || "Profile update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const newOtp = [...otp];
    newOtp[index] = value;

    setOtp(newOtp);
    setOtpValue("otp", newOtp.join(""));

    if (value && index < 5) {
      setTimeout(() => {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }, 0);
    }
  };

  const handleBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setError("");
    setOtp(["", "", "", "", "", ""]);
  };

  /* ---------------- UI (UNCHANGED) ---------------- */

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-linear-to-br from-green-400 to-blue-500"
      } flex justify-center items-center`}
    >
      <motion.div className="w-full max-w-md p-4">
        <div className="text-center mb-6">
          <FaWhatsapp className="text-green-500 text-6xl mx-auto" />
          <h1 className="text-xl font-bold">WhatsApp Login</h1>
        </div>

        {error && <p className="text-red-500 text-center">{error}</p>}

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleLoginSubmit(onLoginSubmit)}>
            <input placeholder="Phone" {...loginRegister("phoneNumber")} />
            <input placeholder="Email" {...loginRegister("email")} />

            <button type="submit">{loading ? <Spinner /> : "Send OTP"}</button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={handleOtpSubmit(onOtpSubmit)}>
            <div className="flex gap-2">
              {otp.map((v, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  maxLength={1}
                  value={v}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                />
              ))}
            </div>

            <button type="submit">
              {loading ? <Spinner /> : "Verify OTP"}
            </button>

            <button type="button" onClick={handleBack}>
              Back
            </button>
          </form>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
            <input {...profileRegister("username")} placeholder="Username" />

            <input
              type="file"
              onChange={handleProfileChange}
              accept="image/*"
            />

            <input type="checkbox" {...profileRegister("agreed")} />

            <button disabled={loading}>
              {loading ? <Spinner /> : "Create Profile"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
