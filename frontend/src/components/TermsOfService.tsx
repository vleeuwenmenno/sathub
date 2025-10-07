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

const TermsOfService: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} to="/" color="neutral">
          {t("nav.home")}
        </MuiLink>
        <Typography>{t("footer.termsOfService")}</Typography>
      </Breadcrumbs>

      <Typography level="h1" sx={{ mb: 4, textAlign: "center" }}>
        Terms of Service
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
          These Terms of Service ("Terms") govern your use of SatHub ("Service,"
          "Platform," "we," "us," or "our"), a satellite image sharing platform
          hosted in the Netherlands. By creating an account or using our
          Service, you agree to be bound by these Terms.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          2. Service Description
        </Typography>

        <Typography sx={{ mb: 2 }}>Our Service allows users to:</Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Create accounts and set up user profiles</li>
          <li>View satellite image posts ("Posts") from ground stations</li>
          <li>
            Upload satellite images, CBOR data, and station information if
            operating a ground station
          </li>
          <li>Like and comment on posts and other comments</li>
          <li>Report inappropriate content, users, or stations</li>
          <li>
            Participate in our achievement system and gamification features
          </li>
          <li>
            Receive optional email notifications about platform activities
          </li>
        </ul>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          3. Account Registration and User Information
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          3.1 Account Creation
        </Typography>

        <Typography sx={{ mb: 2 }}>
          To use our Service, you must create an account by providing:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>A unique username</li>
          <li>A valid email address</li>
          <li>A secure password</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          3.2 Optional Profile Information
        </Typography>

        <Typography sx={{ mb: 2 }}>You may optionally provide:</Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>A display name</li>
          <li>A profile picture</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          3.3 Account Responsibility
        </Typography>

        <Typography sx={{ mb: 2 }}>You are responsible for:</Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Maintaining the confidentiality of your account credentials</li>
          <li>All activities that occur under your account</li>
          <li>Ensuring all information provided is accurate and up-to-date</li>
          <li>
            Notifying us immediately of any unauthorized use of your account
          </li>
        </ul>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          4. User-Generated Content and Content License
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          4.1 Content Types
        </Typography>

        <Typography sx={{ mb: 2 }}>
          "User Content" includes all content you submit to our Platform,
          including but not limited to:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Satellite images and photographs</li>
          <li>CBOR metadata files</li>
          <li>Station location coordinates and information</li>
          <li>Comments and text content</li>
          <li>Profile information and images</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          4.2 Content License Grant
        </Typography>

        <Typography sx={{ mb: 2 }}>
          By uploading or submitting User Content to our Platform, you grant us
          a non-exclusive, worldwide, royalty-free, sublicensable license to:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>
            Use, display, reproduce, modify, and distribute your Content for
            platform operation
          </li>
          <li>
            Combine your satellite images with other users' uploads to create
            composite works, mosaics, or derivative content
          </li>
          <li>
            Process your CBOR data and location coordinates for collaborative
            mapping projects
          </li>
          <li>Store and backup your Content on our servers</li>
          <li>
            Use your Content for platform improvement and feature development
          </li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          4.3 Content Ownership
        </Typography>

        <Typography sx={{ mb: 2 }}>
          You retain ownership of your User Content. The license you grant to us
          does not transfer ownership but allows us to operate the Service
          effectively.
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          4.4 Future Collaborative Projects
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We may use your uploaded satellite images, CBOR data, and station
          coordinates for future collaborative community projects, including but
          not limited to:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Creating large-scale satellite image mosaics</li>
          <li>Developing composite maps and visualizations</li>
          <li>Contributing to community-driven mapping initiatives</li>
          <li>Research and educational purposes</li>
        </ul>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          5. Acceptable Use and Community Guidelines
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          5.1 Permitted Uses
        </Typography>

        <Typography sx={{ mb: 2 }}>You may use our Service to:</Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>
            Share legitimate satellite imagery captured by your own equipment
          </li>
          <li>Engage respectfully with other users' content</li>
          <li>Participate in community discussions and achievements</li>
          <li>Report genuine abuse or policy violations</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          5.2 Prohibited Content and Conduct
        </Typography>

        <Typography sx={{ mb: 2 }}>
          You may not upload, post, or transmit content that:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Violates any applicable laws or regulations</li>
          <li>Infringes on intellectual property rights of others</li>
          <li>Contains malicious code, viruses, or harmful software</li>
          <li>Is defamatory, harassing, threatening, or abusive</li>
          <li>Promotes illegal activities or violence</li>
          <li>Violates others' privacy or publicity rights</li>
          <li>Contains false or misleading information about satellite data</li>
          <li>Contains pornography or sexually explicit material</li>
          <li>
            Is spam, commercial advertising, or promotional material (unless
            authorized)
          </li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          5.3 Station and Equipment Requirements
        </Typography>

        <Typography sx={{ mb: 2 }}>If adding a ground station:</Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>
            You must have legitimate access to satellite receiving equipment
          </li>
          <li>
            All uploaded satellite data must be authentic and accurately
            attributed
          </li>
          <li>Station location information must be truthful and accurate</li>
          <li>
            You must comply with all applicable radio frequency and
            telecommunications regulations
          </li>
        </ul>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          6. Reporting and Content Moderation
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          6.1 Reporting System
        </Typography>

        <Typography sx={{ mb: 2 }}>Users may report:</Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Inappropriate or abusive content</li>
          <li>User misconduct</li>
          <li>Station authenticity concerns</li>
          <li>Terms of Service violations</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          6.2 Our Response
        </Typography>

        <Typography sx={{ mb: 2 }}>We reserve the right to:</Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Remove or modify content that violates these Terms</li>
          <li>Suspend or terminate user accounts for violations</li>
          <li>Investigate reported abuse and take appropriate action</li>
          <li>Cooperate with law enforcement when required</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          6.3 No Obligation to Monitor
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We are not obligated to monitor all User Content but reserve the right
          to do so.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          7. Achievement System and Gamification
        </Typography>

        <Typography sx={{ mb: 2 }}>
          Our Platform includes achievement features that recognize user
          participation, such as:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Posting satellite images</li>
          <li>Community engagement</li>
          <li>Commenting and interaction milestones</li>
          <li>Station operation achievements</li>
        </ul>

        <Typography sx={{ mb: 2 }}>
          Achievements are for entertainment and community engagement purposes
          and have no monetary value.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          8. Email Notifications
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          8.1 Notification Types
        </Typography>

        <Typography sx={{ mb: 2 }}>
          With your consent, we may send email notifications about:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>New posts and comments on your content</li>
          <li>Achievement unlocks and milestones</li>
          <li>Account-related information and security updates</li>
          <li>Platform updates and important announcements</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          8.2 Opt-out Options
        </Typography>

        <Typography sx={{ mb: 2 }}>
          You may opt-out of email notifications at any time through your
          account settings or by following unsubscribe links in our emails.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          9. Intellectual Property Rights
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          9.1 Platform Rights
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We own all rights to the Platform's software, design, trademarks, and
          proprietary technology. Users may not copy, modify, or distribute our
          intellectual property.
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          9.2 User Content Rights
        </Typography>

        <Typography sx={{ mb: 2 }}>
          Users retain ownership of their original content but grant us the
          license described in Section 4.
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          9.3 Respect for Others' Rights
        </Typography>

        <Typography sx={{ mb: 2 }}>
          Users must respect the intellectual property rights of others and may
          not upload content that infringes on copyrights, trademarks, or other
          proprietary rights.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          10. Privacy and Data Protection
        </Typography>

        <Typography sx={{ mb: 2 }}>
          Your privacy is important to us. Please review our Privacy Policy,
          which describes how we collect, use, and protect your personal
          information. By using our Service, you consent to our privacy
          practices as described in our Privacy Policy.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          11. Disclaimers and Limitations of Liability
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          11.1 Service "As Is"
        </Typography>

        <Typography sx={{ mb: 2 }}>
          Our Service is provided "as is" without warranties of any kind. We do
          not guarantee continuous, error-free, or secure operation.
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          11.2 Content Disclaimer
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We are not responsible for the accuracy, reliability, or legality of
          User Content. Users access and use content at their own risk.
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          11.3 Limitation of Liability
        </Typography>

        <Typography sx={{ mb: 2 }}>
          To the maximum extent permitted by law, we shall not be liable for any
          indirect, incidental, special, or consequential damages arising from
          your use of the Service.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          12. Account Termination
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          12.1 Termination by You
        </Typography>

        <Typography sx={{ mb: 2 }}>
          You may terminate your account at any time by contacting us or using
          account deletion features.
        </Typography>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          12.2 Termination by Us
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We may terminate or suspend accounts for:
        </Typography>

        <ul style={{ marginBottom: "1rem" }}>
          <li>Violations of these Terms</li>
          <li>Inactivity for extended periods</li>
          <li>Legal or regulatory requirements</li>
          <li>Platform discontinuation</li>
        </ul>

        <Typography level="h3" sx={{ mt: 3, mb: 2 }}>
          12.3 Effect of Termination
        </Typography>

        <Typography sx={{ mb: 2 }}>
          Upon termination, your right to use the Service ends, but these Terms
          remain in effect regarding previously submitted content and our
          respective obligations.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          13. Changes to Terms
        </Typography>

        <Typography sx={{ mb: 2 }}>
          We may modify these Terms at any time. Changes will be posted on our
          Platform with an updated effective date. Continued use of the Service
          after changes constitutes acceptance of the modified Terms.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          14. Governing Law and Jurisdiction
        </Typography>

        <Typography sx={{ mb: 2 }}>
          These Terms are governed by Dutch law. Any disputes arising from these
          Terms or the Service shall be subject to the exclusive jurisdiction of
          Dutch courts.
        </Typography>

        <Typography level="h2" sx={{ mt: 4, mb: 2 }}>
          15. Contact Information
        </Typography>

        <Typography sx={{ mb: 2 }}>
          For questions about these Terms, please contact us at:
        </Typography>

        <Typography sx={{ mb: 2 }}>
          <strong>SatHub</strong>
          <br />
          Email: support@sathub.de
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
          By using our Service, you acknowledge that you have read, understood,
          and agree to be bound by these Terms of Service.
        </Typography>
      </Box>
    </Container>
  );
};

export default TermsOfService;
