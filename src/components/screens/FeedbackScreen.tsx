import React, { useState } from 'react';
import { ArrowLeft, Send, Star, CheckCircle2 } from 'lucide-react';

interface FeedbackScreenProps {
  onBack: () => void;
}

export const FeedbackScreen: React.FC<FeedbackScreenProps> = ({ onBack }) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [text, setText] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const feedbackEmail = "veerendra93397@gmail.com";

  const handleSend = () => {
    const starString = "⭐".repeat(rating);
    const ratingText = rating > 0 ? `${starString} (${rating}/5)` : 'Not rated';
    const bodyContent = `Rating: ${ratingText}\n\nFeedback:\n${text.trim() || 'No additional comments provided.'}`;

    const mailtoUri = `mailto:${feedbackEmail}?subject=${encodeURIComponent("CBMU Assistant Feedback")}&body=${encodeURIComponent(bodyContent)}`;
    
    // Open email client
    window.location.href = mailtoUri;
    setSubmitted(true);
    setTimeout(() => {
      onBack();
    }, 1500);
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
        <h2 className="font-semibold text-base">Feedback</h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-5 max-w-xl mx-auto w-full">
        {submitted ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-16 h-16 text-[#10A37F] mb-4 animate-in zoom-in-75 duration-300" />
            <h3 className="text-xl font-bold text-white mb-1">Thank You!</h3>
            <p className="text-sm text-neutral-400">Your feedback email has been opened.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-neutral-200 mb-2.5">
                How was your experience?
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 rounded-lg transition-transform active:scale-90"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          isFilled
                            ? 'text-[#10A37F] fill-[#10A37F]'
                            : 'text-neutral-600 hover:text-neutral-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-200 mb-2">
                Tell us more (optional)
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What worked well? What was confusing or wrong?"
                rows={5}
                className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3.5 text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#10A37F] transition-colors resize-none"
              />
            </div>

            <button
              onClick={handleSend}
              className="w-full flex items-center justify-center gap-2 bg-[#10A37F] hover:bg-[#1A7F64] active:scale-[0.98] text-white font-medium py-3.5 px-5 rounded-xl transition-all shadow-lg shadow-[#10A37F]/20"
            >
              <Send className="w-4 h-4" />
              <span>Send Feedback</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
