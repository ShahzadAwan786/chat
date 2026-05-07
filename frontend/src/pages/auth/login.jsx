import React from "react";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import useLoginStore from "../../store/use-login-store";
import { useState } from "react";
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

const loginValidationSchema = yup
  .object()
  .shape({
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^\d+$/, "Phone number be digit")
      .transform((value, originalValue) =>
        originalValue.trim() === "" ? null : value,
      ),
    email: yup
      .string()
      .nullable()
      .notRequired()
      .email("Please enter valid email")
      .transform((value, originalValue) =>
        originalValue.trim() === "" ? null : value,
      ),
  })
  .test(
    "at-least-one ",
    "Either email or phoneNumber is required",
    function (value) {
      return !!(value.phoneNumber || value.email);
    },
  );
const otpValidationSchema = yup.object().shape({
  otp: yup
    .string()
    .length(6, "Otp must be excatly 6 digits")
    .required("Otp is required"),
});

const profileValidationSchema = yup.object().shape({
  username: yup.string().required("Username is required"),
  agreed: yup.bool().oneOf([true], "You must agree to the terms"),
});
export default function LogIn() {
  const { step, userPhoneData, setStep, setUserPhoneData, resetLoginState } =
    useLoginStore();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[15]);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureFile, setprofilePictureFile] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[4]);
  const [error, setError] = useState("");
  const { setUser } = useUserStore();
  const { theme, setTheme } = useThemeStore();
  const [showDropDown, setShowDropDown] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const navigation = useNavigate();

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
  });

  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue,
  } = useForm({
    resolver: yupResolver(otpValidationSchema),
  });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    watch,
  } = useForm({
    resolver: yupResolver(profileValidationSchema),
  });
  const ProgressBar = () => (
    <div
      className={`w-full h-2.5  rounded-full mb-6 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"} transation-all duration-500 ease-in-out`}
    >
      <div
        className="bg-green-600 rounded-full h-2.5"
        style={{ width: `${(step / 3) * 100}%` }}
      ></div>
    </div>
  );
  const filterCountry = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(search.toLowerCase()) ||
      country.dialCode.includes(search),
  );

  const onLoginSubmit = async (data) => {
    try {
      const { email, phoneNumber } = data;
      setLoading(true);
      if (email) {
        const res = await sendOtp({
          phoneSuffix: null,
          email,
          phoneNumber: null,
        });
        if (res.status === "success") {
          toast.info("OTP is send  to your email ");
          setUserPhoneData({ email });
          setStep(2);
        }
      } else {
        const res = await sendOtp({
          email: null,
          phoneNumber,
          phoneSuffix: selectedCountry.dialCode,
        });
        if (res.status === "success") {
          toast.info("OTP is send  to your phoneNumber ");
          setUserPhoneData({
            phoneNumber,
            phoneSuffix: selectedCountry.dialCode,
          });
          setStep(2);
        }
      }
      setError("");
    } catch (error) {
      console.log(error);
      setError(error.message || "Failed to send otp");
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async () => {
    try {
      setLoading(true);
      setError("");

      if (!userPhoneData?.email && !userPhoneData?.phoneNumber) {
        throw new Error("Email or phone number is missing");
      }
      if (!otp || otp.length !== 6 || otp.includes("")) {
        setError("Please enter a valid OTP");
        return;
      }

      const otpString = otp.join("");

      let res;
      if (userPhoneData?.email) {
        res = await verifyOtp({
          email: userPhoneData.email,
          otp: otpString,
        });
      } else {
        res = await verifyOtp({
          phoneNumber: userPhoneData.phoneNumber,
          phoneSuffix: userPhoneData.phoneSuffix,
          otp: otpString,
        });
      }

      if (res?.status === "success") {
        const user = res.data?.user;

        toast.success("OTP verified successfully");

        const token = res.data?.token;
        localStorage.setItem("auth-token", token);

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
    } catch (error) {
      console.log(error);
      setError(error?.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    setprofilePictureFile(e.target.files[0]);
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
      toast.success("Welcome to Whatsapp");
      navigation("/");
      resetLoginState();
    } catch (error) {
      console.log(error);
      setError(error.message || "Failed to update user profile");
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
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setError(null);
    setOtp(["", "", "", "", "", ""]);
  };
  return (
    <>
      <div
        className={`min-h-screen ${theme === "dark" ? "bg-gray-900" : "bg-linear-to-br from-green-400 to-blue-500"} flex justify-center items-center overflow-auto`}
      >
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`${theme === "dark" ? "bg-gray-900 text-white" : "bg-white"} p-4 md:p-8 rounded-xl shadow-2xl w-full max-w-md mx-5`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 0.3,
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
            className="w-24 h-24 bg-green-500 rounded-full mx-auto flex items-center justify-center mb-6"
          >
            <FaWhatsapp className="fill-white h-16 w-16" />
          </motion.div>
          <h1
            className={`${theme === "dark" ? "text-white" : "text-gray-800"} text-3xl font-bold text-center mb-6`}
          >
            Whatsapp Login
          </h1>
          <ProgressBar />
          {error && (
            <p className="text-red-500 mb-4 text-sm text-center">{error}</p>
          )}
          {step === 1 && (
            <>
              <p
                className={`${theme === "dark" ? "text-gray-200" : "text-gray-900"} text-center mb-4`}
              >
                Enter your phoneNumber to receive otp
              </p>
              <form
                onSubmit={handleLoginSubmit(onLoginSubmit)}
                className="space-y-4"
              >
                <div className="relative ">
                  <div className="flex ">
                    <div className="relative w-1/3 ">
                      <button
                        type="button"
                        className={`${theme === "dark" ? "bg-gray-700 text-white border-gray-600" : "text-gray-900 bg-gray-100 border-gray-300"} border px-4 py-2.5 rounded-s-lg shrink-0 inline-flex text-center items-center justify-center text-sm font-medium focus:bg-gray-200 focus:ring-gray-100`}
                        onClick={() => setShowDropDown(!showDropDown)}
                      >
                        <img
                          src={selectedCountry.flag}
                          alt={selectedCountry.flag}
                          className="w-4 mr-1"
                        />{" "}
                        {selectedCountry.dialCode}
                        <FaChevronDown className="ml-2" />
                      </button>
                      {showDropDown && (
                        <div
                          className={`absolute z-10 ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-300"} border rounded-md shadow-lg max-h-60 overflow-auto w-full mt-1 `}
                        >
                          <div
                            className={`sticky top-0 ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"} p-2`}
                          >
                            <input
                              type="text"
                              placeholder="Search countries.."
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              className={`${theme === "dark" ? "bg-gray-700 border-gray-500 text-white" : "bg-white border-gray-300"} border px-2 py-1 rounded-lg w-full text-sm`}
                            />{" "}
                          </div>

                          {filterCountry.map((country) => (
                            <button
                              type="button"
                              key={country.alpha2}
                              className={`px-3 py-2 ${theme === "dark" ? "hover:bg-gray-700 " : "hover:bg-gray-200"} cursor-pointer w-full text-left`}
                              onClick={() => {
                                setSelectedCountry(country);
                                setShowDropDown(false);
                              }}
                            >
                              <img
                                src={country.flag}
                                alt={country.flag}
                                className="w-4 mr-1"
                              />{" "}
                              {country.name} {country.dialCode}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Phone Number"
                      className={`${theme === "dark" ? "bg-gray-700 text-white border-gray-600" : "bg-white border-gray-300"} w-2/3 border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 ${loginErrors.phoneNumber ? "border-red-500" : ""}`}
                      {...loginRegister("phoneNumber")}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  {loginErrors.phoneNumber && (
                    <p className="text-red-500 text-sm font-medium my-1">
                      {loginErrors.phoneNumber.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center my-4">
                  <div className="grow bg-gray-500 h-0.5" />
                  <span className="mx-3 text-sm text-gray-500 font-medium">
                    or
                  </span>
                  <div className="grow bg-gray-500 h-0.5" />
                </div>
                <div>
                  <div
                    className={`${theme === "dark" ? "bg-gray-700 text-white border-gray-600" : "bg-white border-gray-300"} border flex items-center justify-center rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 ${loginErrors.email ? "border-red-500" : ""}`}
                  >
                    <IoPerson
                      className={`${theme === "dark" ? "text-gray-400" : "text-gray-500"} mr-2`}
                    />
                    <input
                      type="email"
                      placeholder="Email (Optional) "
                      {...loginRegister("email")}
                      className={`${theme === "dark" ? " text-white " : ""} w-full focus:outline-none `}
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="text-red-500 text-sm font-medium my-1">
                      {loginErrors.email.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className={` w-full bg-green-500 text-white font-medium py-2  rounded-lg mt-6 cursor-pointer hover:bg-green-600`}
                >
                  {loading ? <Spinner /> : " Send Otp"}
                </button>
              </form>
            </>
          )}
          {step === 2 && (
            <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-4">
              <p
                className={`${theme === "dark" ? "text-white" : "text-gray-600 "} text-sm text-center`}
              >
                Please enter the 6-digits OTP send to your{" "}
                {userPhoneData?.phoneSuffix || userPhoneData?.email}{" "}
                {userPhoneData && userPhoneData?.phoneNumber}
              </p>
              <div className="flex justify-between">
                {" "}
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    className={`w-12 h-12 text-center border ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"} rounded-lg text-xl font-medium focus:outline-none focus:ring-2 focus:ring-green-500 ${otpErrors.otp ? "border-red-500" : ""}`}
                  />
                ))}
              </div>
              {otpErrors.otp && (
                <p className="text-red-500 text-sm font-medium my-1">
                  {otpErrors.otp.message}
                </p>
              )}
              <button
                type="submit"
                className={` w-full bg-green-500 text-white font-medium py-2  rounded-lg mt-6 cursor-pointer hover:bg-green-600`}
              >
                {loading ? <Spinner /> : " Verify Otp"}
              </button>
              <button
                type="button"
                className={` w-full bg-green-500 text-white font-medium py-2  rounded-lg cursor-pointer hover:bg-green-600 flex justify-center items-center`}
                onClick={() => handleBack()}
              >
                <FaArrowLeft className="mr-2" /> Wrong{" "}
                {userPhoneData?.phoneNumber ? "number" : "email"} Go Back
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
              <div className=" flex flex-col justify-center items-center mb-4">
                <div className="relative w-24 h-24 mb-2">
                  <img
                    src={profilePicture || selectedAvatar}
                    alt="profile"
                    className="w-full h-full rounded-full bg-amber-300 object-cover"
                  />
                  <label
                    htmlFor="profile-picture"
                    className="absolute bottom-0 right-0 bg-green-500 p-1 rounded-full cursor-pointer hover:bg-green-600"
                  >
                    <FaPlus className="fill-white " />
                  </label>
                  <input
                    type="file"
                    id="profile-picture"
                    accept="image/*"
                    onChange={handleProfileChange}
                    className="hidden"
                  />
                </div>
              </div>
              <div
                className={`${theme === "dark" ? "bg-gray-700 text-white border-gray-600" : "bg-white border-gray-300"}  border flex items-center justify-center rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 ${profileErrors.username ? "border-red-500" : ""} my-4`}
              >
                <IoPerson
                  className={`${theme === "dark" ? "text-gray-400" : "text-gray-500"} mr-2`}
                />
                <input
                  type="text"
                  placeholder="Enter username "
                  {...profileRegister("username")}
                  className={`${theme === "dark" ? " text-white " : ""} w-full focus:outline-none `}
                />
              </div>
              {profileErrors.username && (
                <p className="text-red-500 text-sm font-medium my-1">
                  {profileErrors.username.message}
                </p>
              )}
              <div className="space-x-2 ">
                <input
                  type="checkbox"
                  id="agreed"
                  {...profileRegister("agreed")}
                />
                <label
                  htmlFor="agreed"
                  className={theme === "dark" ? "text-white" : "text-gray-700"}
                >
                  I agree to the{" "}
                  <a href="#" className="text-red-500 text-sm hover:underline">
                    Terms and Conditions
                  </a>
                </label>
                {profileErrors.agreed && (
                  <p className="text-red-500 text-sm font-medium my-1">
                    {profileErrors.agreed.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={!watch("agreed") || loading}
                className={` w-full bg-green-500 text-white font-medium py-2 text-lg rounded-lg mt-6 cursor-pointer hover:bg-green-600 transition-all duration-300 transform ease-in-out hover:scale-105 ${loading ? "opacity-50 cursor-not-allowed " : ""}`}
              >
                {loading ? <Spinner /> : "Create Profile"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </>
  );
}
