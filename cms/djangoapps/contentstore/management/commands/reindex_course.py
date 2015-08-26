""" Management command to update courses' search index """
from django.core.management import BaseCommand, CommandError
from optparse import make_option
from textwrap import dedent

from contentstore.courseware_index import CoursewareSearchIndexer

from opaque_keys.edx.keys import CourseKey
from opaque_keys import InvalidKeyError
from opaque_keys.edx.locations import SlashSeparatedCourseKey
from opaque_keys.edx.locator import CourseLocator

from .prompt import query_yes_no

from xmodule.modulestore.django import modulestore


class Command(BaseCommand):
    """
    Command to re-index courses

    Examples:

        ./manage.py reindex_course <course_id_1> <course_id_2> - reindexes courses with keys course_id_1 and course_id_2
        ./manage.py reindex_course --all - reindexes all available courses
    """
    help = dedent(__doc__)

    can_import_settings = True

    args = "<course_id course_id ...>"

    option_list = BaseCommand.option_list + (
        make_option(
            '--all',
            action='store_true',
            dest='all',
            default=False,
            help='Reindex all courses'
        ),)

    CONFIRMATION_PROMPT = u"Reindexing all courses might be a time consuming operation. Do you want to continue?"

    def _parse_course_key(self, raw_value):
        """ Parses course key from string """
        try:
            result = CourseKey.from_string(raw_value)
        except InvalidKeyError:
            result = SlashSeparatedCourseKey.from_deprecated_string(raw_value)

        if not isinstance(result, CourseLocator):
            raise CommandError(u"Argument {0} is not a course key".format(raw_value))

        return result

    def handle(self, *args, **options):
        """
        By convention set by django developers, this method actually executes command's actions.
        So, there could be no better docstring than emphasize this once again.
        """
        if len(args) == 0 and not options.get('all', False):
            raise CommandError(u"reindex_course requires one or more arguments: <course_id>")

        store = modulestore()

        if options.get('all', False):
            if query_yes_no(self.CONFIRMATION_PROMPT, default="no"):
                course_keys = [course for course in modulestore().get_courses_keys()]
            else:
                return
        else:
            course_keys = map(self._parse_course_key, args)

        for course_key in course_keys:
            CoursewareSearchIndexer.do_course_reindex(store, course_key)
