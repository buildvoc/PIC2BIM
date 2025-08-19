import React from 'react';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <div
      className={`fixed top-0 left-0 h-full z-50 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={{
        width: 350,
        maxWidth: '90vw',
        top: 'auto',
        bottom: 0,
        maxHeight: 'calc(100vh - 113px)',
        border: '1px solid #ccc',
      }}
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
