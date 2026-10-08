const { supabase, createUserClient } = require('../db/supabase');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');

const ANONYMOUS_PERSONAS = [
  { name: 'Anonymous Owl', avatarKey: 'owl' },
  { name: 'Anonymous Moon', avatarKey: 'moon' },
  { name: 'Anonymous Star', avatarKey: 'star' },
  { name: 'Anonymous Leaf', avatarKey: 'leaf' },
  { name: 'Anonymous Fox', avatarKey: 'fox' },
  { name: 'Anonymous Panda', avatarKey: 'panda' },
  { name: 'Anonymous Wolf', avatarKey: 'wolf' },
  { name: 'Anonymous Bear', avatarKey: 'bear' }
];

function getRandomPersona(chosenName) {
  if (chosenName && chosenName.trim()) {
    const trimmed = chosenName.trim();
    const match = ANONYMOUS_PERSONAS.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (match) return match;
    return { name: trimmed, avatarKey: 'owl' };
  }
  const randomIndex = Math.floor(Math.random() * ANONYMOUS_PERSONAS.length);
  return ANONYMOUS_PERSONAS[randomIndex];
}

async function getOrCreateAnonymousProfile(userClient, userId, chosenIdentity, academicContext) {
  // Try fetching existing anonymous profile
  const { data: existing, error: fetchErr } = await userClient
    .from('anonymous_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    if (chosenIdentity && chosenIdentity.trim() && existing.display_name !== chosenIdentity.trim()) {
      const persona = getRandomPersona(chosenIdentity);
      const { data: updated } = await userClient
        .from('anonymous_profiles')
        .update({
          display_name: persona.name,
          avatar_key: persona.avatarKey,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .maybeSingle();

      if (updated) {
        return {
          id: updated.id,
          anonymousDisplayName: updated.display_name,
          avatarKey: updated.avatar_key || 'owl',
          academicContext: academicContext || 'College student'
        };
      }
    }

    return {
      id: existing.id,
      anonymousDisplayName: existing.display_name || existing.anonymous_display_name || existing.anonymous_name || 'Anonymous Peer',
      avatarKey: existing.avatar_key || 'owl',
      academicContext: academicContext || 'College student'
    };
  }

  // Create new anonymous profile
  const persona = getRandomPersona(chosenIdentity);
  const newProfileData = {
    user_id: userId,
    display_name: persona.name,
    avatar_key: persona.avatarKey
  };

  const { data: created, error: createErr } = await userClient
    .from('anonymous_profiles')
    .insert(newProfileData)
    .select()
    .maybeSingle();

  if (createErr || !created) {
    console.warn('Anonymous profile creation warning:', createErr);
    return {
      id: userId,
      anonymousDisplayName: persona.name,
      avatarKey: persona.avatarKey,
      academicContext: academicContext || 'College student'
    };
  }

  return {
    id: created.id,
    anonymousDisplayName: created.display_name || persona.name,
    avatarKey: created.avatar_key || persona.avatarKey,
    academicContext: academicContext || 'College student'
  };
}

async function getUserRole(userClient, user) {
  if (!user) return 'student';
  let role = user.user_metadata?.role || user.app_metadata?.role;
  if (!role && userClient) {
    const { data: profile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && profile.role) {
      role = profile.role;
    }
  }
  return role || 'student';
}

class AuthService {
  static async register({ email, password, chosenIdentity, academicContext }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      throw new BadRequestError(error.message, 'REGISTRATION_FAILED');
    }

    const user = data.user;
    if (!user) {
      throw new BadRequestError('Registration failed to create user', 'REGISTRATION_FAILED');
    }

    const session = data.session;
    const token = session?.access_token;
    const userClient = token ? createUserClient(token) : supabase;

    // Get or create anonymous profile
    const anonymousProfile = await getOrCreateAnonymousProfile(userClient, user.id, chosenIdentity, academicContext);
    const role = await getUserRole(userClient, user);

    return {
      token: token || null,
      user: {
        id: user.id,
        email: user.email,
        role
      },
      anonymousProfile
    };
  }

  static async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new UnauthorizedError(error.message, 'INVALID_CREDENTIALS');
    }

    const user = data.user;
    const session = data.session;
    const token = session?.access_token;

    const userClient = createUserClient(token);
    const anonymousProfile = await getOrCreateAnonymousProfile(userClient, user.id);
    const role = await getUserRole(userClient, user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role
      },
      anonymousProfile
    };
  }

  static async getMe(user, token) {
    const userClient = createUserClient(token);
    const anonymousProfile = await getOrCreateAnonymousProfile(userClient, user.id);
    const role = await getUserRole(userClient, user);

    return {
      id: user.id,
      email: user.email,
      role,
      anonymousProfile
    };
  }

  static async updateProfile(userClient, user, { nickname, academicContext }) {
    if (!user || !user.id) {
      throw new UnauthorizedError('User authentication required', 'AUTH_REQUIRED');
    }

    const { data: existing } = await userClient
      .from('anonymous_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    let updatedProfile = null;

    if (existing) {
      const updateData = { updated_at: new Date().toISOString() };
      if (nickname) updateData.display_name = nickname;

      const { data, error } = await userClient
        .from('anonymous_profiles')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (!error && data) {
        updatedProfile = data;
      }
    } else {
      const persona = getRandomPersona(nickname);
      const { data, error } = await userClient
        .from('anonymous_profiles')
        .insert({
          user_id: user.id,
          display_name: persona.name,
          avatar_key: persona.avatarKey
        })
        .select()
        .maybeSingle();

      if (!error && data) {
        updatedProfile = data;
      }
    }

    const role = await getUserRole(userClient, user);

    return {
      id: user.id,
      email: user.email,
      role,
      anonymousProfile: {
        id: updatedProfile?.id || existing?.id || user.id,
        anonymousDisplayName: updatedProfile?.display_name || nickname || existing?.display_name || 'Anonymous Peer',
        avatarKey: updatedProfile?.avatar_key || existing?.avatar_key || 'owl',
        academicContext: academicContext || 'College student'
      }
    };
  }

  static async getOrCreateAnonymousProfile(userClient, userId, chosenIdentity, academicContext) {
    return getOrCreateAnonymousProfile(userClient, userId, chosenIdentity, academicContext);
  }
}

module.exports = AuthService;
