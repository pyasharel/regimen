import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PasswordResetEmailProps {
  resetLink: string;
}

export const PasswordResetEmail = ({ resetLink }: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your Regimen password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset Your Password</Heading>
        
        <Text style={text}>
          We received a request to reset your password for your Regimen account.
        </Text>

        <Text style={text}>
          Click the button below to create a new password:
        </Text>

        <Section style={ctaSection}>
          <Link
            href={resetLink}
            style={button}
          >
            Reset Password
          </Link>
        </Section>

        <Text style={text}>
          This link will expire in 1 hour for security reasons.
        </Text>

        <Section style={warningSection}>
          <Text style={warningText}>
            <strong>Didn't request this?</strong>
            <br />
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </Text>
        </Section>

        <Text style={footer}>
          Stay secure,
          <br />
          The Regimen Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  maxWidth: '600px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  lineHeight: '1.3',
}

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const ctaSection = {
  margin: '32px 0',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#8B5CF6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const warningSection = {
  margin: '32px 0',
  padding: '20px',
  backgroundColor: '#fff3cd',
  borderRadius: '8px',
  borderLeft: '4px solid #f0ad4e',
}

const warningText = {
  color: '#856404',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
}

const footer = {
  color: '#8a8a8a',
  fontSize: '14px',
  lineHeight: '1.6',
  marginTop: '32px',
}
