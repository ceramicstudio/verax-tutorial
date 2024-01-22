import Head from "next/head";
import Nav from "../components/navbar";
import ProfileCard from "../components/profile";
import type { NextPage } from "next";
import { useEffect, useState } from "react";
import {  useAccount } from "wagmi";

const Home: NextPage = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const { address } = useAccount();

  useEffect(() => {
    if (address) {
      setLoggedIn(true);
    }
  }, [address]);

  return (
    <>
      <Nav />
      <Head>
        <title>Developer Profile Portal</title>
        <meta name="description" content="" />
        <link rel="icon" href="https://ver.ax/assets/verax-logo-circle-588179e3.svg" />
      </Head>
      {loggedIn ? (
        <main className="bg-gray">
          <ProfileCard />
        </main>
      ) : (
        <main className="bg-gray"></main>
      )}
    </>
  );
};

export default Home;
