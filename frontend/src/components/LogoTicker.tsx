import { motion } from 'framer-motion';

const logos = [
  { name: "Sony", src: "https://upload.wikimedia.org/wikipedia/commons/c/c4/Sony_logo.svg" },
  { name: "Amazon", src: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" },
  { name: "Microsoft", src: "https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg" },
  { name: "Meta", src: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg" },
  { name: "Google", src: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
];

export function LogoTicker() {
  return (
    <section className="py-20 bg-[#FAFAFA] border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-sm font-medium text-gray-500 mb-10">Trusted by 50,000+ job seekers</p>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale">
          {logos.map((logo, i) => (
            <motion.img 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              src={logo.src} 
              alt={logo.name} 
              className="h-6 md:h-8 object-contain"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
