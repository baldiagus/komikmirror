"use client";

import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

let registered = false;

export function ensureGsapRegistered() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(useGSAP, Flip, ScrollTrigger);
  registered = true;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, Flip, ScrollTrigger, useGSAP };
