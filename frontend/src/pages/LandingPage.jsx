import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { WritingInterface } from '../components/WritingInterface';
import { FeatureFlowSection } from '../components/FeatureFlowSection';
import { PrivacyTrust } from '../components/PrivacyTrust';
import { FinalCTA } from '../components/FinalCTA';
import { Footer } from '../components/Footer';
import { StoryModal } from '../components/StoryModal';
import { ShareStoryModal } from '../components/ShareStoryModal';
import { EXPERIENCES_DATA } from '../data/experiences';
import { useRouter } from '../context/RouterContext';

export function LandingPage() {
  const { navigate } = useRouter();
  const [inputText, setInputText] = useState('');
  const [selectedStoryId, setSelectedStoryId] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [experiences, setExperiences] = useState(EXPERIENCES_DATA);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleHeroSelectThought = (thoughtText) => {
    setInputText(thoughtText);
    scrollTo('write-section');
  };

  const handleWritingSubmit = (text) => {
    setInputText(text);
    // Smoothly route to matching with state or scroll to demo
    navigate('/matching', { userInput: text, topic: 'Academic pressure' });
  };

  const handleOpenStory = (id) => {
    setSelectedStoryId(id);
  };

  const handleStorySubmitted = (newStory) => {
    setExperiences([newStory, ...experiences]);
  };

  const activeStory = experiences.find(s => s.id === selectedStoryId) || EXPERIENCES_DATA.find(s => s.id === selectedStoryId);

  return (
    <div className="beenthere-landing-page">
      {/* Existing Minimal Navbar */}
      <Navbar
        onExploreClick={() => navigate('/explore')}
        onWriteClick={() => navigate('/share')}
        onHowItWorksClick={() => scrollTo('how-it-works')}
        onPrivacyClick={() => scrollTo('privacy')}
        onSignInClick={() => navigate('/login')}
      />

      <main>
        {/* Hero with Subtle Thought Fragments */}
        <Hero
          onSelectThought={handleHeroSelectThought}
          onScrollToWriter={() => scrollTo('write-section')}
        />

        {/* The Core Writing Interface */}
        <WritingInterface
          initialText={inputText}
          onSubmitSearch={handleWritingSubmit}
          onSelectPreset={(thought) => setInputText(thought)}
        />

        {/* Targeted Feature Flow Section: 🧠 Understand -> 🤝 Find -> 💬 Talk Privately -> 🌱 No Match -> 🛡️ Safety */}
        <FeatureFlowSection onOpenStory={handleOpenStory} />

        {/* Privacy & Trust Pillars */}
        <PrivacyTrust />

        {/* Final CTA */}
        <FinalCTA
          onFindClick={() => navigate('/share')}
          onExploreClick={() => navigate('/explore')}
        />
      </main>

      {/* Footer with Crisis Notice */}
      <Footer
        onScrollTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onExploreClick={() => navigate('/explore')}
        onHowItWorksClick={() => scrollTo('how-it-works')}
        onPrivacyClick={() => scrollTo('privacy')}
      />

      {/* Reader Modal */}
      {selectedStoryId && (
        <StoryModal
          story={activeStory}
          onClose={() => setSelectedStoryId(null)}
          onShareOwn={() => navigate('/share')}
        />
      )}

      {/* Anonymous Share Modal */}
      <ShareStoryModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onStorySubmitted={handleStorySubmitted}
      />
    </div>
  );
}
