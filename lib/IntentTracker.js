"use client"

/**
 * lib/IntentTracker.js
 * Tracks user behavior on the site to 'silently tag' their intent.
 * This helps sales reps understand if a customer is more worried about 
 * Price, Range, or Service before they even call.
 */
export const trackIntent = (tag) => {
  if (typeof window === "undefined") return;
  
  const current = JSON.parse(sessionStorage.getItem("evcrm_intent") || "{}")
  current[tag] = (current[tag] || 0) + 1
  sessionStorage.setItem("evcrm_intent", JSON.stringify(current))
}

export const getSilentTags = () => {
  if (typeof window === "undefined") return [];
  
  const current = JSON.parse(sessionStorage.getItem("evcrm_intent") || "{}")
  const tags = []
  
  // Logic: flag intent if user interacts with a feature > 2 times
  if (current.range > 2) tags.push("intent:range_anxiety")
  if (current.price > 2) tags.push("intent:budget_shopping")
  if (current.service > 2) tags.push("intent:service_conscious")
  if (current.speed > 2) tags.push("intent:performance_buyer")
    
  return tags
}
