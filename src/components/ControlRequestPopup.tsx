import React from 'react';

interface ControlRequestPopupProps {
  requesterName: string;
  momoName: string;
  onApprove: () => void;
  onReject: () => void;
}

export default function ControlRequestPopup({
  requesterName,
  momoName,
  onApprove,
  onReject,
}: ControlRequestPopupProps) {
  return (
    <>
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-[4px] z-50" />
      <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-50 max-w-[320px] mx-auto bg-background rounded-lg p-5 animate-fade-in-up text-center">
        <p className="text-sm mb-4">
          {requesterName} 想逗逗你的 <span className="text-primary font-medium">{momoName}</span>~
        </p>
        <div className="flex gap-3">
          <button
            onClick={onApprove}
            className="flex-1 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium transition-bouncy active:scale-95"
          >
            好呀！
          </button>
          <button
            onClick={onReject}
            className="flex-1 py-2.5 rounded-md border border-muted-foreground text-muted-foreground text-sm transition-bouncy active:scale-95"
          >
            不行哦~
          </button>
        </div>
      </div>
    </>
  );
}
