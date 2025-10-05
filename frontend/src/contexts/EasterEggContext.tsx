import React, { createContext, useContext, useState, useRef } from "react";
import type { ReactNode } from "react";
import fartSound from "../assets/Quick Reverb Fart - Sound Effect (HD).mp3";

interface EasterEggContextType {
  showEasterEgg: boolean;
  triggerEasterEgg: () => void;
}

const EasterEggContext = createContext<EasterEggContextType | undefined>(
  undefined
);

export const useEasterEgg = () => {
  const context = useContext(EasterEggContext);
  if (!context) {
    throw new Error("useEasterEgg must be used within EasterEggProvider");
  }
  return context;
};

interface EasterEggProviderProps {
  children: ReactNode;
}

export const EasterEggProvider: React.FC<EasterEggProviderProps> = ({
  children,
}) => {
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const fartAudioRef = useRef<HTMLAudioElement>(null);

  const playFartSound = () => {
    if (fartAudioRef.current) {
      fartAudioRef.current.play().catch((error) => {
        console.log("Fart sound play failed:", error);
      });
    }
  };

  const triggerEasterEgg = () => {
    setShowEasterEgg(true);
    // Auto hide after 10 seconds
    setTimeout(() => {
      playFartSound();
      setShowEasterEgg(false);
    }, 10000);
  };

  return (
    <EasterEggContext.Provider value={{ showEasterEgg, triggerEasterEgg }}>
      {children}
      <audio ref={fartAudioRef} src={fartSound} preload="auto" />
    </EasterEggContext.Provider>
  );
};