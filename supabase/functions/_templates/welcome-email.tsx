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
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'https://esm.sh/react@18.3.1'

interface WelcomeEmailProps {
  fullName: string;
}

export const WelcomeEmail = ({ fullName }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Regimen - Never miss a dose. Reach your goals.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Regimen, {fullName}! 🎉</Heading>
        
        <Text style={text}>
          We're excited to have you on board! Regimen is your personal health companion for tracking compounds, logging doses, and measuring progress.
        </Text>

        <Section style={featureSection}>
          <Heading style={h2}>Here's what you can do:</Heading>
          <ul style={list}>
            <li style={listItem}>📊 Track your daily doses with smart reminders</li>
            <li style={listItem}>💊 Manage multiple compounds with custom schedules</li>
            <li style={listItem}>📸 Document progress with photos and metrics</li>
            <li style={listItem}>🔥 Build streaks and stay motivated</li>
            <li style={listItem}>📈 Visualize your journey with insights</li>
          </ul>
        </Section>

        <Section style={ctaSection}>
          <Link
            href="https://getregimen.app/today"
            style={button}
          >
            Get Started Now
          </Link>
        </Section>

        <Text style={text}>
          Need help? Just reply to this email and we'll be happy to assist you.
        </Text>

        <Text style={footer}>
          Stay consistent,
          <br />
          The Regimen Team
        </Text>

        <Text style={disclaimer}>
          <strong>Important:</strong> Regimen is a tracking tool only and does not provide medical advice. Always consult with healthcare professionals regarding your health decisions.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeEmail

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

const h2 = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const featureSection = {
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
}

const list = {
  margin: '0',
  padding: '0',
  listStyle: 'none',
}

const listItem = {
  color: '#484848',
  fontSize: '15px',
  lineHeight: '1.8',
  marginBottom: '8px',
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

const footer = {
  color: '#8a8a8a',
  fontSize: '14px',
  lineHeight: '1.6',
  marginTop: '32px',
}

const disclaimer = {
  color: '#8a8a8a',
  fontSize: '12px',
  lineHeight: '1.5',
  marginTop: '32px',
  padding: '16px',
  backgroundColor: '#fef3cd',
  borderRadius: '6px',
  borderLeft: '3px solid #f0ad4e',
}
