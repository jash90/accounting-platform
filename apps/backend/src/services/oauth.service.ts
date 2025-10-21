import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { db, users, oauthSessions } from '../db';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { emailService } from './email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface OAuthProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  provider: 'google' | 'github' | 'microsoft';
}

class OAuth2Service {
  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies() {
    // JWT Strategy for token validation
    passport.use(
      new JwtStrategy(
        {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          secretOrKey: JWT_SECRET,
        },
        async (payload, done) => {
          try {
            const [user] = await db
              .select()
              .from(users)
              .where(eq(users.id, payload.userId))
              .limit(1);

            if (user) {
              return done(null, user);
            } else {
              return done(null, false);
            }
          } catch (error) {
            return done(error, false);
          }
        }
      )
    );

    // Google OAuth Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`,
          },
          async (accessToken, refreshToken, profile, done) => {
            try {
              const oauthProfile: OAuthProfile = {
                id: profile.id,
                email: profile.emails?.[0]?.value || '',
                firstName: profile.name?.givenName || '',
                lastName: profile.name?.familyName || '',
                profilePicture: profile.photos?.[0]?.value,
                provider: 'google',
              };

              const user = await this.findOrCreateUser(oauthProfile, accessToken, refreshToken);
              return done(null, user);
            } catch (error) {
              return done(error as Error, false);
            }
          }
        )
      );
    } else {
      console.warn('⚠️ Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
    }

    // GitHub OAuth Strategy
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      passport.use(
        new GitHubStrategy(
          {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/github/callback`,
          },
          async (accessToken: string, refreshToken: string, profile: any, done: any) => {
            try {
              const names = profile.displayName?.split(' ') || ['', ''];
              const oauthProfile: OAuthProfile = {
                id: profile.id,
                email: profile.emails?.[0]?.value || profile.username + '@github.local',
                firstName: names[0] || profile.username || '',
                lastName: names.slice(1).join(' ') || '',
                profilePicture: profile.photos?.[0]?.value,
                provider: 'github',
              };

              const user = await this.findOrCreateUser(oauthProfile, accessToken, refreshToken);
              return done(null, user);
            } catch (error) {
              return done(error as Error, false);
            }
          }
        )
      );
    } else {
      console.warn('⚠️ GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
    }

    // Serialize/Deserialize user for session
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .limit(1);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  async findOrCreateUser(
    profile: OAuthProfile,
    accessToken: string,
    refreshToken?: string
  ) {
    // Check if user exists with this provider ID
    let [existingUser] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.providerId, profile.id),
          eq(users.authProvider, profile.provider)
        )
      )
      .limit(1);

    // If not found by provider ID, check by email
    if (!existingUser) {
      [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, profile.email))
        .limit(1);

      if (existingUser) {
        // User exists with email but different provider, update their OAuth info
        await db
          .update(users)
          .set({
            providerId: profile.id,
            authProvider: profile.provider,
            profilePicture: profile.profilePicture || existingUser.profilePicture,
            isEmailVerified: true, // OAuth providers verify emails
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
      }
    }

    // Create new user if doesn't exist
    if (!existingUser) {
      const [newUser] = await db
        .insert(users)
        .values({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          profilePicture: profile.profilePicture,
          authProvider: profile.provider,
          providerId: profile.id,
          isEmailVerified: true, // OAuth providers verify emails
        })
        .returning();

      existingUser = newUser;

      // Send welcome email for new OAuth users
      await emailService.sendWelcomeEmail(newUser.email, newUser.firstName);
    }

    // Store or update OAuth session
    await this.storeOAuthSession(existingUser.id, profile.provider, accessToken, refreshToken);

    return existingUser;
  }

  private async storeOAuthSession(
    userId: string,
    provider: string,
    accessToken: string,
    refreshToken?: string
  ) {
    // Check if session exists
    const [existingSession] = await db
      .select()
      .from(oauthSessions)
      .where(
        and(
          eq(oauthSessions.userId, userId),
          eq(oauthSessions.provider, provider)
        )
      )
      .limit(1);

    if (existingSession) {
      // Update existing session
      await db
        .update(oauthSessions)
        .set({
          accessToken,
          refreshToken: refreshToken || existingSession.refreshToken,
          updatedAt: new Date(),
        })
        .where(eq(oauthSessions.id, existingSession.id));
    } else {
      // Create new session
      await db.insert(oauthSessions).values({
        userId,
        provider,
        accessToken,
        refreshToken,
      });
    }
  }

  generateJWT(user: any): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        provider: user.authProvider
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  async revokeOAuthSession(userId: string, provider?: string) {
    if (provider) {
      await db
        .delete(oauthSessions)
        .where(
          and(
            eq(oauthSessions.userId, userId),
            eq(oauthSessions.provider, provider)
          )
        );
    } else {
      // Revoke all sessions for user
      await db
        .delete(oauthSessions)
        .where(eq(oauthSessions.userId, userId));
    }
  }
}

export const oauthService = new OAuth2Service();
export { passport };