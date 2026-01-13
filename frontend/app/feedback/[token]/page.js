'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { HiStar, HiCheckCircle, HiExclamationCircle, HiArrowLeft } from 'react-icons/hi';

export default function FeedbackPage() {
  const { token } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (token) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/feedback/${token}`);
      const data = await res.json();

      if (data.success) {
        setValid(true);
        setName(data.data.name);
      } else {
        if (res.status === 409) {
          setSubmitted(true);
          setValid(true);
        } else {
          setError(data.message || 'Invalid feedback link');
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/feedback/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, comment }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Failed to submit feedback');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#009688] border-t-transparent shadow-lg"></div>
          <p className="text-sm font-black text-[#4a4a4a] uppercase tracking-widest animate-pulse">Initializing Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] py-12 px-4 selection:bg-[#009688] selection:text-white">
      <div className="mx-auto max-w-xl">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="overflow-hidden rounded-[2.5rem] bg-white shadow-2xl shadow-black/5"
            >
              <div className="bg-[#4a4a4a] py-16 px-8 text-center border-b-8 border-red-500">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                  <HiExclamationCircle size={48} />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Access Denied</h2>
                <p className="mt-4 text-gray-400 font-bold uppercase tracking-widest text-xs">{error}</p>
              </div>
              <div className="p-12 text-center bg-gray-50/50">
                <button 
                  onClick={() => router.push('/')}
                  className="inline-flex items-center gap-2 text-[#4a4a4a] font-black uppercase text-sm tracking-widest hover:text-[#009688] transition-colors"
                >
                  <HiArrowLeft /> Return to Home
                </button>
              </div>
            </motion.div>
          ) : submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="overflow-hidden rounded-[2.5rem] bg-white shadow-2xl shadow-black/5"
            >
              <div className="bg-[#4a4a4a] py-20 px-8 text-center border-b-8 border-[#009688]">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                  className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#009688]/10 text-[#009688]"
                >
                  <HiCheckCircle size={64} />
                </motion.div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Thank You!</h2>
                <p className="mt-4 text-gray-400 font-bold uppercase tracking-widest text-xs">Your transmission has been received.</p>
              </div>
              <div className="p-12 text-center">
                <p className="text-[#4a4a4a] text-lg font-medium leading-relaxed italic">
                  "Excellence is not an act, but a habit. Your feedback helps us build that habit."
                </p>
                <div className="mt-10 pt-10 border-t border-gray-100 italic text-gray-400 text-sm">
                  — The Kronus Infratech Team
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-[2.5rem] bg-white shadow-2xl shadow-black/5"
            >
              <div className="bg-[#4a4a4a] py-12 px-10 text-center border-b-8 border-[#fbb03b]">
                <div className="inline-block px-4 py-1.5 rounded-full bg-[#fbb03b] text-[#4a4a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                  Experience Portal
                </div>
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">
                  Voice of <span className="text-[#fbb03b]">Customer</span>
                </h1>
                <p className="mt-4 text-gray-400 font-bold uppercase tracking-widest text-[11px]">
                  Refining our legacy for {name}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-12 space-y-10">
                <div className="text-center">
                  <label className="mb-6 block text-xs font-black text-[#4a4a4a] uppercase tracking-[0.15em]">
                    Rate Your Experience
                  </label>
                  <div className="flex justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        type="button"
                        whileHover={{ scale: 1.2, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        className="focus:outline-none"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                      >
                        <HiStar
                          size={48}
                          className={`transition-colors duration-200 ${
                            star <= (hoverRating || rating) ? 'text-[#fbb03b]' : 'text-gray-100'
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={rating}
                    className="mt-6 text-[10px] font-black text-[#4a4a4a] uppercase tracking-[0.25em]"
                  >
                    {rating === 1 && 'Critical'}
                    {rating === 2 && 'Standard'}
                    {rating === 3 && 'Exceptional'}
                    {rating === 4 && 'Elite'}
                    {rating === 5 && 'Masterclass'}
                    {rating === 0 && 'Awaiting Selection'}
                  </motion.p>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-black text-[#4a4a4a] uppercase tracking-[0.15em] ml-1">
                    Intelligence Briefing <span className="text-gray-300 tracking-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={5}
                    className="w-full rounded-3xl border-2 border-gray-50 bg-gray-50 p-6 text-gray-900 outline-none focus:border-[#009688] focus:bg-white transition-all duration-300 resize-none font-medium placeholder:text-gray-300"
                    placeholder="Share the specifics of your experience..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  ></textarea>
                </div>

                <motion.button
                  type="submit"
                  disabled={submitting || rating === 0}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full group overflow-hidden rounded-3xl bg-[#009688] py-5 px-8 font-black text-white uppercase tracking-[0.2em] text-sm shadow-xl shadow-[#009688]/20 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed transition-all"
                >
                  <span className="relative z-10">
                    {submitting ? 'Transmitting Data...' : 'Finalize Feedback'}
                  </span>
                  <motion.div 
                    className="absolute inset-0 bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
                  />
                </motion.button>

                <p className="text-center text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                  Secure End-To-End Feedback Protocol • Kronus V0.14
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
