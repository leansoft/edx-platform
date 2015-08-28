# -*- coding: utf-8 -*-
"""
Tests django_sudo_helpers templatetags to create third party auth links.
"""
from mock import patch
from django.conf import settings
from social.apps.django_app.default import models as social_models
from django.test import TestCase
from django.test.client import RequestFactory

from third_party_auth.tests import testutil
from django_sudo_helpers.templatetags import third_party_auth_links


class ThirdPartyAuthLinkTests(testutil.TestCase, TestCase):
    """
    Make sure some of the templatetags work.
    """
    def setUp(self):
        """
        Test third party auth links.
        """
        super(ThirdPartyAuthLinkTests, self).setUp()
        self.user = social_models.DjangoStorage.user.create_user(username='username', password='password')
        self.request = RequestFactory().get('/')

    @patch.dict(settings.FEATURES, {'ENABLE_THIRD_PARTY_AUTH': False})
    def test_third_party_auth_links_disabled(self):
        """
        Test that response is empty when third party auth is disabled.
        """
        self.assertEqual(settings.FEATURES["ENABLE_THIRD_PARTY_AUTH"], False)
        self.request.user = self.user
        response = third_party_auth_links.third_party_auth_links({'request': self.request})
        self.assertEqual(response, '')

    @patch.dict(settings.FEATURES, {'ENABLE_THIRD_PARTY_AUTH': True})
    def test_third_party_auth_links_enabled(self):
        """
        Test that response has buttons when third party auth is enabled for google and linkedin.
        """
        self.assertEqual(settings.FEATURES["ENABLE_THIRD_PARTY_AUTH"], True)
        # Get and enable providers.
        google_provider = self.configure_google_provider(enabled=True)
        linkedin_provider = self.configure_linkedin_provider(enabled=True)

        # Link provides to user account.
        social_models.DjangoStorage.user.create_social_auth(self.user, 'uid', google_provider.backend_name)
        social_models.DjangoStorage.user.create_social_auth(self.user, 'uid', linkedin_provider.backend_name)

        self.request.user = self.user
        response = third_party_auth_links.third_party_auth_links({'request': self.request})

        # Assert that button classes are present in response for enabled providers.
        self.assertIn('button-oa2-google-oauth2 login-oa2-google-oauth2', response)
        self.assertIn('button-oa2-linkedin-oauth2 login-oa2-linkedin-oauth2', response)
