import React from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  return (
    <section className="landing-hero">
      <span className="badge">CodeCraft IDE</span>
      <h1 className="landing-hero__title">Ship better code with AI superpowers.</h1>
      <p className="landing-hero__subtitle">
        Build, debug, and collaborate in the browser with an AI pair-programmer, persistent file workspace,
        and instant Git integrations—no setup required.
      </p>
      <div className="landing-hero__cta">
        <Link className="button" to="/signup">Create a workspace</Link>
        <Link className="button button--ghost" to="/login">Sign in</Link>
      </div>
      <div className="landing-hero__meta">
        <div className="landing-hero__meta-item">
          <span className="landing-hero__meta-title">AI Assistant</span>
          <span className="landing-hero__meta-description">Generate, refactor, and explain code with context from your files.</span>
        </div>
        <div className="landing-hero__meta-item">
          <span className="landing-hero__meta-title">Realtime Saving</span>
          <span className="landing-hero__meta-description">Keep your work safe with automatic file persistence and history.</span>
        </div>
        <div className="landing-hero__meta-item">
          <span className="landing-hero__meta-title">Team Ready</span>
          <span className="landing-hero__meta-description">Invite collaborators, review changes, and deploy with confidence.</span>
        </div>
      </div>
    </section>
  );
}

export default Landing;