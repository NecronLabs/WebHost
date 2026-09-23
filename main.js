// Destructure from global Motion object
const { animate, inView, stagger, spring } = Motion;

// Initialize animations once DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    
    // 0. Initialize Vanta.js Globe Background
    if (typeof VANTA !== 'undefined') {
        VANTA.GLOBE({
            el: "#vanta-bg",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00,
            color: 0xc9182b, // Red accent
            color2: 0x880000, // Secondary darker red
            size: 1.50,
            backgroundColor: 0x0f0f11 // Matches --bg-color
        });
    }

    // 1. Initial Page Load Animations (Hero Section)
    animate("header", 
        { y: [-30, 0], opacity: [0, 1] }, 
        { duration: 0.8, ease: "ease-out" }
    );
    
    animate(".gsap-reveal", 
        { y: [40, 0], opacity: [0, 1] }, 
        { duration: 0.8, delay: stagger(0.2, { start: 0.4 }), ease: "ease-out" }
    );

    // 2. Scroll Animations for Project Cards
    inView(".gsap-card", (info) => {
        animate(info.target, 
            { y: [50, 0], opacity: [0, 1] }, 
            { duration: 0.6, ease: "ease-out" }
        );
    });

    // 3. Optional: Magnetic button effect for primary CTA
    const primaryBtn = document.querySelector('.btn-primary');
    
    if (primaryBtn) {
        primaryBtn.addEventListener('mousemove', (e) => {
            const rect = primaryBtn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            animate(primaryBtn, { x: x * 0.2, y: y * 0.2 }, { duration: 0.3, ease: "ease-out" });
        });

        primaryBtn.addEventListener('mouseleave', () => {
            animate(primaryBtn, { x: 0, y: 0 }, { type: "spring", stiffness: 300, damping: 10 });
        });
    }
});
