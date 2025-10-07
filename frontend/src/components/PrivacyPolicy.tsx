import React from "react";
import {
  Box,
  Typography,
  Container,
  Breadcrumbs,
  Link as MuiLink,
} from "@mui/joy";
import { Link } from "react-router-dom";
import { useTranslation } from "../contexts/TranslationContext";

const PrivacyPolicy: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} to="/" color="neutral">
          {t("nav.home")}
        </MuiLink>
        <Typography>{t("footer.privacyPolicy")}</Typography>
      </Breadcrumbs>

      <Typography level="h1" sx={{ mb: 4, textAlign: "center" }}>
        Privacy Policy
      </Typography>

      <Box
        sx={{
          typography: "body1",
          lineHeight: 1.7,
          "& ul": { pl: 3 },
          "& li": { mb: 1, color: "text.primary" },
        }}
      >
        <Typography level="body-sm" sx={{ mb: 2, color: "text.tertiary" }}>
          <strong>Last Updated:</strong> 07-10-2025
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          1. Introduction
        </Typography>

        <Typography sx={{ mb: 2 }}>
          This Privacy Policy describes how SatHub ("we," "us," or "our")
          collects, uses, processes, and protects your personal information when
          you use our satellite image sharing platform (the "Service"). This
          Policy applies to all users of our Service hosted in the Netherlands.
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We are committed to protecting your privacy and complying with
          applicable data protection laws, including the European Union General
          Data Protection Regulation (GDPR) and Dutch data protection
          legislation.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          2. Data Controller Information
        </Typography>

        <Typography sx={{ mb: 2 }}>
          <strong>Data Controller:</strong>
          <br />
          SatHub
          <br />
          Email: support@sathub.de
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          3. Personal Data We Collect
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          3.1 Information You Provide Directly
        </Typography>

        <Typography sx={{ mb: 2 }}>
          When you create an account and use our Service, we collect:
        </Typography>

        <Typography sx={{ mb: 1 }}>
          <strong>Account Information:</strong>
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>Username (required)</li>
          <li>Email address (required)</li>
          <li>Password (encrypted and securely stored)</li>
          <li>Display name (optional)</li>
          <li>Profile picture (optional)</li>
        </ul>

        <Typography sx={{ mb: 1 }}>
          <strong>Content and Usage Data:</strong>
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>Satellite images you upload</li>
          <li>CBOR metadata files associated with your uploads</li>
          <li>CADU files associated with your uploads</li>
          <li>Ground station location coordinates</li>
          <li>Comments and text content you post</li>
          <li>Posts you like and interact with</li>
          <li>Reports you submit about content or users</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          3.2 Information Automatically Collected
        </Typography>

        <Typography sx={{ mb: 2 }}>
          When you use our Service, we may automatically collect:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>IP address and general location information</li>
          <li>Device information (browser type, operating system)</li>
          <li>Login timestamps and session information</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          3.3 Technical and Metadata Information
        </Typography>

        <Typography sx={{ mb: 2 }}>
          Associated with your satellite image uploads:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>CBOR data files containing technical parameters</li>
          <li>CADU data files</li>
          <li>Timestamp and frequency information</li>
          <li>Antenna and equipment specifications</li>
          <li>Geographic coordinates of ground stations</li>
        </ul>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          4. Legal Basis for Processing
        </Typography>

        <Typography sx={{ mb: 2 }}>
          Under GDPR, we process your personal data based on the following legal
          grounds:
        </Typography>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          4.1 Contract Performance (Article 6(1)(b) GDPR)
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>Providing access to our platform services</li>
          <li>Managing your user account</li>
          <li>Facilitating content sharing and community features</li>
          <li>Processing achievement and gamification systems</li>
        </ul>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          4.2 Legitimate Interests (Article 6(1)(f) GDPR)
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>Platform security and fraud prevention</li>
          <li>Service improvement and analytics</li>
          <li>Technical support and troubleshooting</li>
          <li>
            Creating community-driven satellite image mosaics and collaborative
            projects
          </li>
        </ul>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          4.3 Consent (Article 6(1)(a) GDPR)
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>Sending email notifications (with your explicit consent)</li>
          <li>Using optional profile information</li>
          <li>Future collaborative projects involving your uploaded content</li>
        </ul>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          4.4 Legal Compliance (Article 6(1)(c) GDPR)
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>Complying with applicable laws and regulations</li>
          <li>Responding to legal requests and court orders</li>
        </ul>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          5. How We Use Your Personal Data
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          5.1 Service Provision
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>Creating and managing your user account</li>
          <li>Enabling content upload, viewing, and interaction features</li>
          <li>
            Facilitating community engagement (likes, comments, achievements)
          </li>
          <li>Processing reports of abuse or policy violations</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          5.2 Communication
        </Typography>

        <Typography sx={{ mb: 2 }}>
          With your consent, we use your email address to send:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Notifications about new posts and comments on your content</li>
          <li>Achievement unlocks and milestone notifications</li>
          <li>Account security updates and important service announcements</li>
          <li>Optional platform news and feature updates</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          5.3 Content Processing and Collaborative Projects
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We may use your uploaded satellite images, CBOR data, and location
          coordinates to:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Display your content to other platform users</li>
          <li>
            Create composite satellite image mosaics combining multiple users'
            uploads
          </li>
          <li>Develop community mapping projects and visualizations</li>
          <li>Improve our platform's technical capabilities</li>
          <li>Support research and educational initiatives</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          5.4 Platform Improvement
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>Analyzing usage patterns to improve user experience</li>
          <li>Developing new features and services</li>
          <li>Ensuring platform security and stability</li>
          <li>Troubleshooting technical issues</li>
        </ul>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          6. Data Sharing and Disclosure
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          6.1 No Sale of Personal Data
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We do not sell, rent, or trade your personal data to third parties.
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          6.2 Public Information
        </Typography>

        <Typography sx={{ mb: 2 }}>
          Certain information is publicly visible on our platform:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Your username and display name</li>
          <li>Profile picture (if provided)</li>
          <li>Uploaded satellite images and associated metadata</li>
          <li>Comments and likes on public posts</li>
          <li>Achievement badges and platform activity</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          6.3 Service Providers
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We may share personal data with trusted service providers who assist
          us with:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Web hosting and cloud storage</li>
          <li>Email delivery services</li>
          <li>Analytics and performance monitoring</li>
          <li>Technical support and maintenance</li>
        </ul>

        <Typography sx={{ mb: 2 }}>
          All service providers are contractually bound to protect your data and
          use it only for specified purposes.
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          6.4 Legal Requirements
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We may disclose personal data when required by law or to:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Comply with legal process or government requests</li>
          <li>Protect our rights, property, or safety</li>
          <li>Prevent fraud or illegal activities</li>
          <li>Enforce our Terms of Service</li>
        </ul>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          7. International Data Transfers
        </Typography>

        <Typography sx={{ mb: 2 }}>
          Our Service is hosted in the Netherlands within the European Economic
          Area (EEA). If we transfer your personal data outside the EEA, we
          ensure appropriate safeguards are in place, such as:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>
            Standard Contractual Clauses approved by the European Commission
          </li>
          <li>Adequacy decisions by the European Commission</li>
          <li>Other legally recognized transfer mechanisms</li>
        </ul>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          8. Data Retention
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We retain your personal data for the following periods:
        </Typography>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          8.1 Account Data
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>Active accounts: Until account deletion is requested</li>
          <li>
            Deleted accounts: 30 days after deletion request (for backup and
            security purposes)
          </li>
        </ul>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          8.2 Content Data
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>
            Uploaded images and metadata: Until content is deleted by user or
            account termination
          </li>
          <li>
            Comments and interactions: Until deleted by user or account
            termination
          </li>
        </ul>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          8.3 Email Communications
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>
            Email notification preferences and history: Until consent is
            withdrawn or account deletion
          </li>
        </ul>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          8.4 Technical Data
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>Server logs and analytics: Maximum 24 months</li>
          <li>Security and fraud prevention data: Maximum 12 months</li>
        </ul>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          9. Your Rights Under GDPR
        </Typography>

        <Typography sx={{ mb: 2 }}>
          As a data subject under GDPR, you have the following rights:
        </Typography>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          9.1 Right of Access (Article 15)
        </Typography>
        <Typography sx={{ mb: 2 }}>
          You can request information about the personal data we process about
          you.
        </Typography>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          9.2 Right to Rectification (Article 16)
        </Typography>
        <Typography sx={{ mb: 2 }}>
          You can request correction of inaccurate or incomplete personal data.
        </Typography>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          9.3 Right to Erasure (Article 17)
        </Typography>
        <Typography sx={{ mb: 2 }}>
          You can request deletion of your personal data under certain
          circumstances.
        </Typography>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          9.4 Right to Restrict Processing (Article 18)
        </Typography>
        <Typography sx={{ mb: 2 }}>
          You can request limitation of processing under specific conditions.
        </Typography>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          9.5 Right to Data Portability (Article 20)
        </Typography>
        <Typography sx={{ mb: 2 }}>
          You can request a copy of your data in a structured, machine-readable
          format.
        </Typography>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          9.6 Right to Object (Article 21)
        </Typography>
        <Typography sx={{ mb: 2 }}>
          You can object to processing based on legitimate interests or direct
          marketing.
        </Typography>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          9.7 Right to Withdraw Consent
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Where processing is based on consent, you can withdraw consent at any
          time.
        </Typography>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          9.8 Exercising Your Rights
        </Typography>
        <Typography sx={{ mb: 2 }}>
          To exercise these rights, contact us at privacy@sathub.de. We will
          respond within 30 days of receiving your request.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          10. Data Security
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We implement appropriate technical and organizational measures to
          protect your personal data:
        </Typography>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          10.1 Technical Measures
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>Encryption of data in transit and at rest</li>
          <li>Secure authentication and access controls</li>
          <li>Regular security updates and vulnerability assessments</li>
          <li>Backup and disaster recovery procedures</li>
        </ul>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          10.2 Organizational Measures
        </Typography>
        <ul style={{ marginBottom: "1rem" }}>
          <li>Staff training on data protection principles</li>
          <li>Access controls limiting data access to authorized personnel</li>
          <li>Data processing policies and procedures</li>
          <li>Regular security audits and compliance reviews</li>
        </ul>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          11. Cookies and Tracking Technologies
        </Typography>

        <Typography sx={{ mb: 2 }}>
          Our Service uses cookies and similar technologies to:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Maintain your login session</li>
          <li>Remember your preferences and settings</li>
          <li>Analyze platform usage and performance</li>
          <li>Ensure platform security</li>
        </ul>

        <Typography sx={{ mb: 2 }}>
          You can control cookie settings through your browser preferences.
          However, disabling certain cookies may affect platform functionality.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          12. Children's Privacy
        </Typography>

        <Typography sx={{ mb: 2 }}>
          Our Service is not intended for children under 16 years of age. We do
          not knowingly collect personal data from children under 16. If you
          believe a child has provided personal data to us, please contact us
          immediately.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          13. Changes to This Privacy Policy
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We may update this Privacy Policy periodically. Changes will be posted
          on our platform with an updated effective date. We will notify users
          of significant changes through:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Email notifications to registered users</li>
          <li>Prominent notices on our platform</li>
          <li>In-app notifications</li>
        </ul>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          14. Contact Information and Complaints
        </Typography>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          14.1 Contact Us
        </Typography>

        <Typography sx={{ mb: 2 }}>
          For questions about this Privacy Policy or our data practices:
        </Typography>

        <Typography sx={{ mb: 2 }}>
          <strong>Privacy Contact:</strong>
          <br />
          Email: privacy@sathub.de
        </Typography>

        <Typography level="h4" sx={{ mt: 3, mb: 2 }}>
          14.2 Supervisory Authority
        </Typography>

        <Typography sx={{ mb: 2 }}>
          You have the right to lodge a complaint with the Dutch Data Protection
          Authority:
        </Typography>

        <Typography sx={{ mb: 2 }}>
          <strong>Autoriteit Persoonsgegevens (AP)</strong>
          <br />
          Postbus 93374
          <br />
          2509 AJ Den Haag
          <br />
          Netherlands
          <br />
          Website: autoriteitpersoonsgegevens.nl
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          15. Effective Date
        </Typography>

        <Typography sx={{ mb: 2 }}>
          This Privacy Policy is effective as of 01-09-2025 and was last updated
          on 07-10-2025.
        </Typography>

        <Typography
          sx={{
            mt: 4,
            fontStyle: "italic",
            borderTop: "1px solid",
            borderColor: "divider",
            pt: 2,
          }}
        >
          By using our Service, you acknowledge that you have read and
          understood this Privacy Policy and consent to the collection and
          processing of your personal data as described herein.
        </Typography>
      </Box>
    </Container>
  );
};

export default PrivacyPolicy;
