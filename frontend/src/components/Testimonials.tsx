import { motion } from 'framer-motion';

const reviews = [
  {
    initials: "DP",
    name: "Dylan Phillips",
    role: "Software Engineer",
    text: "WOW! The Tailored Resume Editor is ridiculously cool. I had so much fun checking off each suggestion and seeing the match score go up. The AI suggestions are incredibly on-point."
  },
  {
    initials: "BC",
    name: "Bhuvan Chandi",
    role: "Product Manager",
    text: "atsai matched my resume to the job description in under 30 seconds, and the result was already very close to what I'd normally do manually. Huge time saver."
  },
  {
    initials: "HM",
    name: "Hyndhavi Muthi",
    role: "Data Analyst",
    text: "I used to spend 30-40 mins to tailor my resume. After using atsai, within a few secs it tailors my resume with a proper ATS score. TBH I started getting more calls!"
  },
  {
    initials: "NR",
    name: "Narendher Reddy",
    role: "Marketing Specialist",
    text: "Streamlining of job search improved, this application is saving a lot of time and improved my quality of applications."
  },
  {
    initials: "AS",
    name: "Ashif S",
    role: "UX Designer",
    text: "Excellent tool that makes job applications so much easier and faster! The cover letter generator is a game changer."
  },
  {
    initials: "JL",
    name: "Jessica Lin",
    role: "Frontend Developer",
    text: "The strict fact-checking feature gives me peace of mind. It never hallucinates skills I don't have, just phrases my actual experience perfectly."
  }
];

// Duplicate array to create a seamless infinite loop
const duplicatedReviews = [...reviews, ...reviews, ...reviews];

export function Testimonials() {
  return (
    <section className="py-32 bg-white border-t border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-16">
        <div className="text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold tracking-tight mb-4"
          >
            Loved by Job Seekers
          </motion.h2>
          <p className="text-gray-500">Real reviews from professionals landing more interviews.</p>
        </div>
      </div>

      {/* Infinite Marquee Container */}
      <div className="relative flex flex-col gap-6 w-full overflow-hidden">
        {/* Left and Right Gradients for smooth fade out */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        {/* Row 1: Moves Left */}
        <div className="flex w-max">
          <motion.div
            animate={{ x: ["0%", "-33.33%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 40 }}
            className="flex gap-6 px-3"
          >
            {duplicatedReviews.map((review, i) => (
              <ReviewCard key={`row1-${i}`} review={review} />
            ))}
          </motion.div>
        </div>

        {/* Row 2: Moves Right */}
        <div className="flex w-max">
          <motion.div
            animate={{ x: ["-33.33%", "0%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 45 }}
            className="flex gap-6 px-3"
          >
            {duplicatedReviews.map((review, i) => (
              <ReviewCard key={`row2-${i}`} review={review} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: typeof reviews[0] }) {
  return (
    <div className="w-[400px] shrink-0 break-inside-avoid bg-[#FAFAFA] border border-gray-100 p-8 rounded-3xl hover:shadow-lg transition-shadow duration-300">
      <div className="flex gap-1 mb-4 text-orange-500">
        {[...Array(5)].map((_, j) => (
          <svg key={j} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-gray-900 font-medium text-sm leading-relaxed mb-6 italic">
        "{review.text}"
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center text-sm font-bold">
          {review.initials}
        </div>
        <div>
          <div className="font-semibold text-sm">{review.name}</div>
          <div className="text-xs text-gray-500">{review.role}</div>
        </div>
      </div>
    </div>
  );
}
