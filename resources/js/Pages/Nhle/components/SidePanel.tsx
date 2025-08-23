import React, { useEffect, useState } from 'react';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose, title, children }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Handle click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
        const target = event.target as HTMLElement;
        const panel = document.querySelector('[data-sidepanel="true"]');
        if (panel && !panel.contains(target)) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Calculate responsive positioning
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        width: '60vw',
        maxWidth: '80vw',
        top: 'calc(65px + 130px)',
        bottom: 0,
        height: 'calc(100vh - 165px)',
        border: '1px solid #ccc',
      };
    } else {
      return {
        width: 350,
        maxWidth: '90vw',
        top: 'calc(65px + 55px)',
        bottom: 0,
        height: 'calc(100vh - 120px)',
        border: '1px solid #ccc',
      };
    }
  };

  return (
    <div
      data-sidepanel="true"
      className={`fixed left-0 z-50 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={getResponsiveStyles()}
    >
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-bold text-lg">{title}</span>
          <button onClick={onClose} className="text-gray-600 hover:text-black">✕</button>
        </div>
        <div className="p-4 flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
