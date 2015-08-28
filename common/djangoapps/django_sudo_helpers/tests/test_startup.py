"""
Tests django-sudo startup
"""
from django.conf import settings
from django.test import TestCase
from mock import patch
from django_sudo_helpers.startup import run


class DjangoSudoStartupTestCase(TestCase):
    """
    Test django-sudo startup
    """

    def setUp(self):
        super(DjangoSudoStartupTestCase, self).setUp()

    @patch.dict("django.conf.settings.FEATURES", {"ENABLE_THIRD_PARTY_AUTH": False})
    def test_run_without_third_party_auth(self):
        self.assertEqual(settings.FEATURES["ENABLE_THIRD_PARTY_AUTH"], False)
        with patch('django_sudo_helpers.startup.enable_third_party_auth_for_sudo') as mock_third_party_for_sudo:
            run()
            self.assertFalse(mock_third_party_for_sudo.called)

    @patch.dict("django.conf.settings.FEATURES", {"ENABLE_THIRD_PARTY_AUTH": True})
    def test_run_without_theme(self):
        self.assertEqual(settings.FEATURES["ENABLE_THIRD_PARTY_AUTH"], True)
        with patch('django_sudo_helpers.startup.enable_third_party_auth_for_sudo') as mock_third_party_for_sudo:
            run()
            self.assertTrue(mock_third_party_for_sudo.called)
