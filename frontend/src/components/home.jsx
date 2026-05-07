import React, { useState } from "react";
import Layout from "./layout";
import ChatList from "../pages/chat-section/chat-list";
import { getAllUsers } from "../services/user-api";
import { useEffect } from "react";
import useLayoutStore from "../store/layout-store";
import { motion } from "framer-motion";

export default function Home() {
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact,
  );

  const [allUsers, setAllusers] = useState([]);

  const getUsers = async () => {
    try {
      const result = await getAllUsers();
      if (result?.status === "success") {
        setAllusers(result?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getUsers();
  }, []);
  return (
    <Layout>
      <motion.div
        inital={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transtion={{ duration: 0.5 }}
        className="h-full "
      >
        <ChatList contacts={allUsers} setSelectedContact={setSelectedContact} />
      </motion.div>
    </Layout>
  );
}
