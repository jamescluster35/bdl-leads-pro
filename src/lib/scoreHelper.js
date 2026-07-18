/**
 * Calculates a dynamic priority score (0 - 100) for a lead to prioritize outreach.
 * 
 * @param {object} lead The lead object
 * @returns {number} The priority score between 0 and 100
 */
export function calculateLeadScore(lead) {
  if (!lead) return 0;
  
  let score = 0;

  // 1. Deal Stage (Max 30 points)
  const stage = lead.dealStage || 'New';
  if (stage === 'Negotiating') {
    score += 30;
  } else if (stage === 'Pitched') {
    score += 20;
  } else if (stage === 'New') {
    score += 10;
  }
  // Cold, Closed, and Lost get 0 points

  // 2. Lead Status (Max 25 points)
  const status = lead.status || 'New';
  if (status === 'Warm') {
    score += 25;
  } else if (status === 'New') {
    score += 15;
  } else if (status === 'Cold') {
    score += 5;
  }
  // Lost status gets 0 points

  // 3. Follow Up Count (Max 20 points)
  const fCount = Number(lead.followUpCount || 0);
  if (fCount >= 1 && fCount <= 3) {
    score += 20; // Active follow-up sweet spot
  } else if (fCount === 0) {
    score += 10; // New lead, needs initial outreach
  } else if (fCount > 3) {
    score += 5;  // At risk of ghosting
  }

  // 4. Last Contact Recency (Max 25 points)
  if (lead.lastContacted) {
    const lastDate = new Date(lead.lastContacted);
    if (!isNaN(lastDate.getTime())) {
      const today = new Date();
      // Calculate difference in full calendar days
      const diffTime = Math.abs(today - lastDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 3) {
        score += 25; // Fresh engagement
      } else if (diffDays <= 7) {
        score += 15; // Due for a follow-up check-in
      } else if (diffDays <= 14) {
        score += 5;  // Getting colder
      }
    }
  }
  
  // Ensure the score is bounded within 0 and 100
  return Math.min(100, Math.max(0, score));
}
