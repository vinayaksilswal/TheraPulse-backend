import React, { useEffect, useState } from 'react';
import { Sparkles, Flame, Percent } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function TopBanner() {
  const location = useLocation();
  const [messaging, setMessaging] = useState({
    text: "FLASH SALE: Up to 64% OFF Storewide | Free Express Shipping",
    icon: <Flame className="h-4 w-4" />
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const campaign = params.get('utm_campaign')?.toLowerCase() || '';

    // If campaign matches our targeting data
    if (campaign.includes('eye') || campaign.includes('puffy')) {
      setMessaging({
        text: "Professional Under-Eye Care: 51% OFF Electric Eye Massager Today!",
        icon: <Sparkles className="h-4 w-4 text-amber-300" />
      });
    } else if (campaign.includes('neck') || campaign.includes('sculpt')) {
      setMessaging({
        text: "Sculpt & Lift at Home: Save 53% on the Facial & Neck Massager!",
        icon: <Sparkles className="h-4 w-4 text-amber-300" />
      });
    } else if (campaign.includes('mask') || campaign.includes('led')) {
      setMessaging({
        text: "Bring the Clinic Home: 42% OFF Lumively Clinical LED Mask",
        icon: <Sparkles className="h-4 w-4 text-amber-300" />
      });
    } else if (campaign.includes('shoulder') || campaign.includes('tension')) {
      setMessaging({
        text: "Relieve Tension Instantly: 64% OFF Electric Neck & Shoulder Massager",
        icon: <Percent className="h-4 w-4" />
      });
    }
  }, [location]);

  return (
    <div className="bg-brand-teal text-white py-2.5 px-4 text-center font-bold text-xs tracking-wide flex items-center justify-center gap-2 relative z-50 shadow-md">
      {messaging.icon}
      <span>{messaging.text}</span>
    </div>
  );
}
