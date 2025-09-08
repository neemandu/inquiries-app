"use client";
import { useEffect } from "react";

export default function Home() {
// Todo : redirect users to this https://cpateam.vercel.app/

  useEffect(() => {
    window.location.href = "https://cpateam.vercel.app/";
  }, []);
  return (
    <div>
    </div>
  )
}