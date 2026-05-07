import { useEffect, useState } from "react";
import useUserStore from "./src/store/use-user-store.js";
import { checkUserAuth } from "./src/services/user-api.js";
import Loader from "./src/utils/loader.jsx";
import { Navigate, Outlet, replace, useLocation } from "react-router-dom";

export default function ProtectedRoute() {
  const { isAuthenticated, setUser, clearUser } = useUserStore();
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const result = await checkUserAuth();
        if (result?.isAuthentication) {
          setUser(result?.user);
        } else {
          clearUser();
        }
      } catch (error) {
        console.log(error);
        clearUser();
      } finally {
        setIsChecking(false);
      }
    };
    verifyAuth();
  }, [setUser, clearUser]);

  if (isChecking) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={"/login"} state={{ from: location }} replace />;
  }
  return <Outlet />;
}

export const PublicRoute = () => {
  const { isAuthenticated } = useUserStore();
  if (isAuthenticated) {
    return <Navigate to={"/"} replace />;
  }
  return <Outlet />;
};
