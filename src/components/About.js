import React from 'react';
import './About.css'; // You can create this CSS file or use existing styles

const About = () => {
  return (
    <div className="about-container">
      <section className="about-hero">
        <div className="container">
          <h1>About JobMatch</h1>
          <p>Transforming recruitment through AI-powered candidate matching</p>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <h2>Our Story</h2>
          <div className="about-content">
            <div className="about-image">
              <img src="/asset/images/team.jpg" alt="JobMatch Team" />
            </div>
            <div className="about-text">
              <p>JobMatch was created by a team of HR professionals and AI specialists who recognized the challenges in today's recruitment landscape. Traditional resume screening is time-consuming, prone to bias, and often overlooks qualified candidates.</p>
              <p>Our founders, experienced in both HR and technology, set out to create a solution that would make recruitment more efficient and fair. By leveraging the power of artificial intelligence, we've developed a platform that analyzes resumes and job descriptions at a depth impossible for manual review.</p>
              <p>Since our launch in 2023, we've helped hundreds of companies find their ideal candidates more quickly and with better long-term outcomes. Our mission is to continue improving the recruitment process for both employers and job seekers, making it more transparent, efficient, and equitable.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="team-section">
        <div className="container">
          <h2>Our Team</h2>
          <div className="team-grid">
            <div className="team-member">
              <div className="member-image">
                <img src="/asset/images/team-member1.jpg" alt="Team Member" />
              </div>
              <h3>Hamza Alabdulkareem</h3>
              <p>Co-Founder & CEO</p>
            </div>
            <div className="team-member">
              <div className="member-image">
                <img src="/asset/images/team-member2.jpg" alt="Team Member" />
              </div>
              <h3>Mushari Albugami</h3>
              <p>Co-Founder & CTO</p>
            </div>
            <div className="team-member">
              <div className="member-image">
                <img src="/asset/images/team-member3.jpg" alt="Team Member" />
              </div>
              <h3>Meshal Saleh Aldosaimani</h3>
              <p>Lead AI Engineer</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;