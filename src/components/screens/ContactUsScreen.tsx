import React from 'react';
import { ArrowLeft, Phone, PhoneCall } from 'lucide-react';

interface ContactUsScreenProps {
  onBack: () => void;
}

export const ContactUsScreen: React.FC<ContactUsScreenProps> = ({ onBack }) => {
  const contacts = [
    { title: "Vice Chancellor's Office", person: "Prof. P.L. Dharma", phone: "08242287347" },
    { title: "Registrar's Office", person: "Dr. Ganesh Sanjeev", phone: "08242287276" },
    { title: "Examination Section", person: "Dr. H Devendrappa (Registrar, Evaluation)", phone: "08242287327" },
    { title: "Finance Officer", person: "Sri Panchalingaswamy S.", phone: "08242287376" },
    { title: "International Students Centre", person: "Dr. B.H. Shekar", phone: "9480146921" },
    { title: "University Library", person: "Dr. M. Purushotham Gowda", phone: "9449450671" },
    { title: "Hostel for Men", person: "Dr. Ramesh H.N.", phone: "08242287206" },
    { title: "Hostel for Women", person: "Dr. H.L Shashirekha", phone: "08242287319" },
  ];

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      {/* Header */}
      <div className="h-14 px-4 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-[#2A2A2A] text-white transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-semibold text-base">Contact Us</h2>
          <p className="text-[11px] text-neutral-400">Official Campus Directory</p>
        </div>
      </div>

      {/* Directory List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-xl mx-auto w-full">
        {contacts.map((c, i) => (
          <div
            key={i}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#10A37F]/15 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-[#10A37F]" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm text-white truncate">{c.title}</h4>
                <p className="text-xs text-neutral-400 truncate mt-0.5">{c.person}</p>
                <p className="text-xs font-mono text-emerald-400 mt-0.5">{c.phone}</p>
              </div>
            </div>

            <button
              onClick={() => handleCall(c.phone)}
              className="p-2.5 rounded-xl bg-[#2A2A2A] hover:bg-[#10A37F] text-neutral-300 hover:text-white transition-all shrink-0 active:scale-95"
              title={`Call ${c.phone}`}
            >
              <PhoneCall className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
