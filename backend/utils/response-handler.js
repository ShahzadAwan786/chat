const response = (res, statusCode, message, data = null) => {
  if (!res) {
    console.error("Response object is  null");
    return;
  }
  const resObj = {
    status: statusCode < 400 ? "success" : "error",
    message,
    data,
  };
  return res.status(statusCode).json(resObj);
};

module.exports = response;
