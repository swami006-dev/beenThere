# BeenThere

### **Someone has been through it before.**

BeenThere is an anonymous peer-support platform that uses AI to help students discover human experiences similar to what they're going through.


---

## 1. The Problem

Students face problems they don't always feel comfortable discussing openly—exam pressure, career confusion, loneliness, social difficulties, relationships, and personal struggles.

The challenge isn't always finding advice.

**It's finding someone who has already been through something similar.**

---

## 2. Our Solution

### **Today's experience can become tomorrow's support.**

A student describes their situation naturally.

```text
Student Reflection
       ↓
AI Understands
       ↓
Semantic Matching
       ↓
Similar Human Experiences
       ↓
Read → Respond → Connect
```

If a close experience doesn't exist, the student's original reflection becomes the starting point for a new conversation instead of generating a fabricated answer.

---

## 3. Why AI Matters

AI is not used as a chatbot or therapist.

It acts as a **discovery layer**.

For every reflection, the backend AI extracts structured information such as:

- Category
- Situation
- Need
- Context
- Tags
- Safety signals

This structured understanding is then used for semantic matching.

### Semantic Matching

We generate **384-dimensional embeddings** using:

`Xenova/all-MiniLM-L6-v2`

and search Experience Cards using:

**Supabase PostgreSQL + pgvector**

This allows semantically similar experiences to be found even when students use different words.

> **AI finds the experience. Humans provide the experience.**

---

## 4. Core User Flow

### Match Found

```text
Share
 ↓
AI Understanding
 ↓
Semantic Matching
 ↓
People Who've Been There Before
 ↓
Read Experience
 ↓
Respond / Talk Privately
```

### No Match

```text
Share
 ↓
AI Understanding
 ↓
No Close Experience
 ↓
Start This Conversation
 ↓
Original Student Post
 ↓
Peer Responses
```

---

## 5. Anonymous Support

Students can:

- Create anonymous reflections
- Respond anonymously
- Request private conversations
- Accept / decline requests
- Chat anonymously
- Block or report

Authentication provides account persistence and security while the public experience does not expose the student's real identity.

---

## 6. Safety

Because BeenThere deals with personal experiences, safety is part of the architecture.

AI-assisted safety analysis can:

- Detect concerning content
- Add safety flags
- Identify cases requiring human review
- Check private conversation messages

BeenThere is a **peer-support platform, not a replacement for professional mental-health or emergency services.**

---

# 7. Architecture

```text
                    React + Vite
                         │
                         ▼
                  Node.js + Express
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      Supabase        Groq +        Embedding
      PostgreSQL      LangChain       Model
      + pgvector                       │
          │                            │
          └──────────────┬─────────────┘
                         ▼
                Semantic Matching
                         │
                         ▼
              Human Experience Cards
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
         Discussions        Private Conversations
```

---

# 8. Database Design

| Table | Purpose |
|---|---|
| `anonymous_profiles` | Anonymous identity linked to an authenticated account |
| `posts` | Student reflections and discussion threads |
| `responses` | Anonymous responses to posts |
| `experience_cards` | Reusable peer experiences + embeddings |
| `ai_analyses` | Structured AI analysis of reflections |

### Important separation

**Posts** are students' own reflections.

**Experience Cards** are reusable experiences discovered by other students.

This allows a new reflection to exist even when there is no existing match.

---

# 9. Backend AI Integration

AI calls are performed **only on the backend**.

The backend:

1. Receives the authenticated request.
2. Validates input.
3. Sends the reflection to the AI service.
4. Enforces structured output using **Zod**.
5. Stores the resulting analysis.
6. Generates an embedding.
7. Performs semantic matching.
8. Returns the relevant experiences.

### Security

API keys are stored in backend environment variables.

They are never exposed through frontend code or committed to GitHub.

---

# 10. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Backend | Node.js + Express |
| Database | Supabase PostgreSQL |
| Vector Search | pgvector |
| AI | Groq + LangChain |
| AI Model | `openai/gpt-oss-120b` |
| Embeddings | `Xenova/all-MiniLM-L6-v2` |
| Validation | Zod |
| Authentication | JWT / bcrypt |

---

# 11. Full-Stack Implementation

BeenThere includes:

- Authentication
- Protected routes
- Anonymous profiles
- REST APIs
- CRUD operations
- Persistent PostgreSQL data
- AI analysis
- Vector search
- Private conversations
- Safety checks
- Input validation
- Error handling
- User-specific data access
- Persistent student history

---



# 13. Setup

### Requirements

- Node.js
- npm
- Supabase
- Groq API key

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `.env` using the provided `.env.example`.

**Never commit real API keys.**

---

# 14. Demo & Deployment

**Live Application:** [ADD DEPLOYED URL]

**Demo Video:** [ADD 2–3 MINUTE VIDEO]

**Test Credentials:**

```text
Email: [ADD DEMO EMAIL]
Password: [ADD DEMO PASSWORD]
```

The demo demonstrates:

**Problem → AI Understanding → Semantic Matching → Human Experience → Private Connection → No Match → Database Persistence**

---

# 15. Limitations & Future Work

BeenThere is an MVP.

Current limitations include:

- Curated/demo Experience Cards
- AI analysis is not professional diagnosis
- Safety AI does not replace human moderation or emergency services
- Semantic similarity can occasionally produce imperfect matches

Future work includes:

- Human-reviewed community Experience Cards
- Multilingual support
- Improved personalized matching
- Stronger moderation and safety infrastructure
- Experience Cards that evolve from valuable community discussions

---

# 16. Vision

BeenThere isn't trying to replace human support with AI.

It uses AI to help people **find human experiences that already exist**.

> **Someone may have been there before.**

And if nobody has—

> **you can be the first person whose experience helps someone else.**

---

## Team

**Team:** [TEAM NAME]

**Members:**
- [Member 1]
- [Member 2]
- [Member 3]
- [Member 4]
