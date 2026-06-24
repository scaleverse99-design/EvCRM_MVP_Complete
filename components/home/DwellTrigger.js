"use client"
import { useState, useEffect } from "react"

/**
 * Dwell Trigger
 * Monitors user dwell time and triggers a conversion modal 
 * after X seconds of active engagement.
 */
export default function DwellTrigger({ onTrigger }) {
  useEffect(() => {
    // Deactivated: Focusing on building visitors first
    return
    
    // const timer = setTimeout(() => {
    //   onTrigger()
    //   localStorage.setItem("evcrm_dwell_triggered", "true")
    // }, 30000) // 30 seconds

    // return () => clearTimeout(timer)
  }, [onTrigger])

  return null; // Invisible component
}
