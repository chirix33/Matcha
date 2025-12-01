# Product Requirements Document: Matcha

|<p>Author: Ashraf Abdul-Muumin</p><p>Status: REVIEWED</p><p>Updated: 2025.11.27</p>|<p>PM: Ashraf Abdul-Muumin, Bernard Bazimya</p><p>UX: Ashraf Abdul-Muumin, Bernard Bazimya</p><p>ENG: Ashraf Abdul-Muumin, Bernard Bazimya </p>|
| :- | :- |

## Product Overview
**Product name (working):** Matcha, an AI-assisted job matching assistant for students and early-career professionals.

Vision:\
Reduce the cognitive and administrative load of job searching by replacing manual resume tailoring and company research with an intelligent assistant that matches users to jobs and explains why each job fits them.
### Primary users:
- International and domestic students seeking internships or entry-level roles.
- Early-career software professionals with limited time for manual job search and research.
-----
## 1\.2 Problem Statement
From our survey, plus interviews with a full-time professional developer and a full-time international student, we observed:

- Job seekers repeatedly read postings, research companies, and tailor resumes for each application, which is time-consuming and tiring.
- Current job platforms often lack smooth “quick apply” flows and do not explain why a job might fit the user, especially when titles are misleading.
- Students in particular would like a future where they do not have to maintain a traditional resume and where an “agent” can research companies on their behalf.

**Therefore:**\
We need a job matching engine that can capture a student’s profile without a resume, match it to relevant jobs, and present both “why this fits you” and “what this company is about” in a concise, understandable format.

-----
## 1\.3 Goals and Success Criteria
**Goals:**

1. Help users discover suitable jobs without having to upload or constantly rewrite resumes.
1. Increase confidence in matches by showing clear, human-readable explanations.
1. Reduce manual company research effort through concise insight cards.
### Success Indicators (for demo/class context):
- In user testing during the demo, at least 80 percent of test users report that the explanations make it “clear” or “very clear” why a job was recommended.
- Users can create a profile and see at least three job recommendations in under five steps and under ten seconds.
- Test users report that SmartMatch feels less tiring than their current search process.
-----
## 1\.4 Key User Stories
1. **Profile capture without resume**
   1. As a student, I want to describe my skills, experience, and preferences in simple questions so that I can get job recommendations without maintaining a traditional resume.
1. **Explanation of fit**
   1. As a job seeker, I want to see why each job matches my profile so that I can quickly decide whether to pursue it.
1. **Company insight**
   1. As a busy applicant, I want the system to summarize key information about each company so that I don’t need to research every role manually.
-----
## 1\.5 Functional Requirements
**FR1 – Profile Capture without Traditional Resume**\
The system shall allow a user to create a job profile, without uploading a resume, by entering skills, education, experience highlights, and job preferences through a guided text-to-speech form.

- Includes structured fields (for example skills, years of experience, tech stack, desired roles, preferred company size or industry).
- Profile data is stored so the user does not need to reenter it for each session.

**FR2 – “Why this job fits me” Explanation (derived from your FR3)**\
For each recommended job, the system shall display a short explanation that describes why the job is a match for the user’s profile.

- Explanation shall reference at least three elements, for example matched skills, relevant experience, alignment with stated preferences such as company size or tech stack.
- Explanations must be rendered in simple language understandable by non-technical users.

**FR3 – Company Insight Card (derived from your FR6)**\
For each recommended job, the system shall display a company insight card that summarizes key information about the company and role.

- At minimum, the card shall include company size (small, medium, large), industry or domain, a brief description of what the company does, and two or three key responsibilities or technologies from the job description.
- The card shall be generated automatically using AI or simple text summarization, so the user does not need to open multiple external pages.
-----
## 1\.6 Non-Functional Requirements
**NFR1 – Performance and Responsiveness (derived from NFR2)**\
For a typical user query with an existing profile, the system shall return and render the top ten job recommendations, along with explanations and company insight cards, within five seconds under normal network conditions in the classroom demo environment.

**NFR2 – Usability (derived from NFR1)**\
A first-time user shall be able to complete profile creation and see at least three job recommendations in no more than five major interactions (for example form sections or chat turns). The interface shall clearly label each step, and the primary call to action on each screen shall be unambiguous.

**NFR3 – Data Privacy Boundary for AI Calls (also ASR3)**\
The system shall ensure that only anonymized or minimally necessary profile information is sent to external AI services. No direct personal identifiers such as name, email address, phone number, or full free-form resume text shall be transmitted to third-party APIs.

-----
## 1\.7 Architecturally Significant Requirements (ASRs)
These requirements are both non-functional and architecture-shaping. They will justify your high-level design choices in the presentation.

**ASR1 – AI Integration Latency and Fault Tolerance**\
The system shall integrate with at least one external Hugging Face AI model for semantic matching or summarization and still satisfy NFR1 performance. If the AI call fails or times out, the system shall fall back to a simpler keyword-based matching strategy and inform the user that an approximate result is being shown.

*Architectural impact:* requires an abstraction layer for AI services, timeout and retry logic, and a fallback matching strategy.

**ASR2 – Explainable Matching Pipeline**\
The matching component shall output not only a numeric score for each job but also the intermediate features used in scoring, such as matched skills and preference overlaps, so that the front-end can construct the “why this job fits me” explanation.

*Architectural impact:* the system must design a pipeline where the matcher exposes structured feature data, not just a black-box ranking. This influences how you store profile data, how you represent job vectors, and how explanations are constructed.

**ASR3 – Data Privacy Boundary for AI Calls**\
The system shall separate personal identity data from the text sent to AI models, using a dedicated layer that transforms profile content into anonymized feature representations or generic descriptions before sending requests externally.

*Architectural impact:* prompts the separation of a “Profile Service” (with PII) from an “AI Matching Service” that only sees non-identifying features, plus clear interfaces between them.

-----
## 1\.8 Out of Scope
- Real integration with live job boards; the system will use a curated or synthetic job dataset for the class demo.
- Long-term storage of real user accounts beyond the demonstration period.
- Legal compliance for production privacy regulations; instead, privacy is addressed at the architectural and educational level.
# 1\.9 Chosen Speech-to-Text Model
**Model selection.** For speech-to-text profile capture, the system will use the Hugging Face model "openai/whisper-small" configured for English. Whisper is a transformer-based encoder–decoder model for automatic speech recognition trained on approximately 680,000 hours of labeled multilingual and multitask speech data. In Matcha, we constrain the initial scope to English speakers only by using the English configuration of the model and designing the UI and prompts for English input.

**Rationale.** We chose openai/whisper-small because it offers a good balance of accuracy, robustness to noise and accents, and runtime performance for a classroom-scale prototype. Compared with older ASR models trained on narrower datasets, Whisper's large and diverse training corpus makes it more resilient to real-world audio conditions, such as varied microphones or moderate background noise. The "small" model size keeps latency acceptable while still benefiting from the overall Whisper architecture. The model is widely supported in open-source tooling, including the Hugging Face Inference API, which simplifies integration for this project.

**Scope limitation.** Although Whisper supports many languages, this prototype explicitly targets English-only usage. All UI labels and guidance will clearly state that the speech capture feature currently supports English speakers only. This constraint reduces complexity for the project and allows us to focus bias and fairness analysis on variation within English pronunciation and fluency.
# 1\.10 Bias, Fairness, and Safety for Speech-to-Text
**Data and model provenance.** Whisper models are trained on a very large dataset of audio–text pairs collected from the internet. While this scale improves robustness, it also means the model inherits any biases present in the underlying data. Accuracy is not uniform across all accents or speaking styles, and performance may be worse for speakers whose speech patterns are under-represented in the training corpus. Our use of the English configuration focuses the risk analysis on variation within English pronunciation and fluency.

**Fairness and error patterns.** Automatic speech recognition systems typically exhibit higher error rates for non-native speakers, strong regional accents, code-switching, and informal or very rapid speech. In Matcha, these errors can translate into missing or incorrectly transcribed skills, job titles, or preferences, which could reduce the quality of job recommendations for certain users. To mitigate this risk, the system will always present the full transcript to the user for confirmation and editing before it is saved to the profile. Critical fields such as skills, degree, and years of experience will be highlighted so users can quickly verify them.

**Safety and privacy.** Voice input may contain personally identifiable information (PII), such as names, employers, or locations. To protect user privacy, Matcha will not persist raw audio files for this prototype and will instead process audio to text and then discard the audio immediately. In line with ASR3 (Data Privacy Boundary for AI Calls), the system will send only the minimally necessary text to external AI and matching services. Prompts will avoid including explicit identifiers whenever possible, and we will discourage users from reading out highly sensitive details. A short notice near the microphone control will explain that a third-party AI service is used for transcription and will advise users to avoid sharing confidential information.

**Misuse and abuse considerations.** Potential misuse includes recording other people without consent or using transcripts to infer sensitive attributes beyond job-related information. Matcha's intended use is for individuals to record their own job histories and preferences. We will include guidance in the interface reminding users not to record others and not to upload highly sensitive content. The system will not perform any explicit inference or filtering based on protected attributes; it will only use transcripts to derive job-relevant skills and preferences.

**Monitoring and fallback.** Operationally, we will monitor transcription failures and obvious misrecognitions during testing, for example when skills are consistently misheard for particular speakers. If we encounter unacceptable behavior for certain scenarios, we can temporarily disable microphone input and fall back to text-only profile capture, while clearly communicating this limitation to users. This fallback behavior aligns with ASR1 by ensuring that the system continues to function even when the ASR model performs poorly or is unavailable.
