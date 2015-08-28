define([
    'jquery',
    'backbone',
    'common/js/spec_helpers/ajax_helpers',
    'teams/js/views/teams_tab',
    'teams/js/spec_helpers/team_spec_helpers'
], function ($, Backbone, AjaxHelpers, TeamsTabView, TeamSpecHelpers) {
    'use strict';

    describe('TeamsTab', function () {
        var expectContent = function (teamsTabView, text) {
            expect(teamsTabView.$('.page-content-main').text()).toContain(text);
        };

        var expectHeader = function (teamsTabView, text) {
            expect(teamsTabView.$('.teams-header').text()).toContain(text);
        };

        var expectError = function (teamsTabView, text) {
            expect(teamsTabView.$('.warning').text()).toContain(text);
        };

        var expectFocus = function (element) {
            expect(element.focus).toHaveBeenCalled();
        };

        var createTeamsTabView = function(options) {
            var defaultTopics = {
                    count: 1,
                    num_pages: 1,
                    current_page: 1,
                    start: 0,
                    results: [{
                        description: 'test description',
                        name: 'test topic',
                        id: 'test_topic',
                        team_count: 0
                    }]
                },
                teamsTabView = new TeamsTabView(
                    _.extend(
                        {
                            el: $('.teams-content'),
                            topics: defaultTopics,
                            userInfo: TeamSpecHelpers.createMockUserInfo(),
                            topicsUrl: 'api/topics/',
                            topicUrl: 'api/topics/topic_id,test/course/id',
                            teamsUrl: 'api/teams/',
                            courseID: 'test/course/id'
                        },
                        options || {}
                    )
                );
            teamsTabView.start();
            return teamsTabView;
        };

        beforeEach(function () {
            setFixtures('<div class="teams-content"></div>');
            spyOn($.fn, 'focus');
        });

        afterEach(function () {
            Backbone.history.stop();
        });

        describe('Navigation', function () {
            it('displays and focuses an error message when trying to navigate to a nonexistent page', function () {
                var teamsTabView = createTeamsTabView();
                teamsTabView.router.navigate('no_such_page', {trigger: true});
                expectError(teamsTabView, 'The page "no_such_page" could not be found.');
                expectFocus(teamsTabView.$('.warning'));
            });

            it('does not interfere with anchor links to #content', function () {
                var teamsTabView = createTeamsTabView();
                teamsTabView.router.navigate('#content', {trigger: true});
                expect(teamsTabView.$('.warning')).toHaveClass('is-hidden');
            });

            it('displays and focuses an error message when trying to navigate to a nonexistent topic', function () {
                var requests = AjaxHelpers.requests(this),
                    teamsTabView = createTeamsTabView();
                teamsTabView.router.navigate('topics/no_such_topic', {trigger: true});
                AjaxHelpers.expectRequest(requests, 'GET', 'api/topics/no_such_topic,test/course/id', null);
                AjaxHelpers.respondWithError(requests, 404);
                expectError(teamsTabView, 'The topic "no_such_topic" could not be found.');
                expectFocus(teamsTabView.$('.warning'));
            });

            it('displays and focuses an error message when trying to navigate to a nonexistent team', function () {
                var requests = AjaxHelpers.requests(this),
                    teamsTabView = createTeamsTabView();
                teamsTabView.router.navigate('teams/test_topic/no_such_team', {trigger: true});
                AjaxHelpers.expectRequest(requests, 'GET', 'api/teams/no_such_team?expand=user', null);
                AjaxHelpers.respondWithError(requests, 404);
                expectError(teamsTabView, 'The team "no_such_team" could not be found.');
                expectFocus(teamsTabView.$('.warning'));
            });
        });

        describe('Discussion privileges', function () {
            it('allows privileged access to any team', function () {
                var teamsTabView = createTeamsTabView({
                    userInfo: TeamSpecHelpers.createMockUserInfo({ privileged: true })
                });
                // Note: using `undefined` here to ensure that we
                // don't even look at the team when the user is
                // privileged
                expect(teamsTabView.readOnlyDiscussion(undefined)).toBe(false);
            });

            it('allows access to a team which an unprivileged user is a member of', function () {
                var teamsTabView = createTeamsTabView({
                    userInfo: TeamSpecHelpers.createMockUserInfo({
                        username: 'test-user',
                        privileged: false
                    })
                });
                expect(teamsTabView.readOnlyDiscussion({
                    attributes: {
                        membership: [{
                            user: {
                                username: 'test-user'
                            }
                        }]
                    }
                })).toBe(false);
            });

            it('does not allow access if the user is neither privileged nor a team member', function () {
                var teamsTabView = createTeamsTabView({
                    userInfo: TeamSpecHelpers.createMockUserInfo({ privileged: false, staff: true })
                });
                expect(teamsTabView.readOnlyDiscussion({
                    attributes: { membership: [] }
                })).toBe(true);
            });
        });

        describe('Search', function () {
            var verifyTeamsRequest = function(requests, options) {
                AjaxHelpers.expectRequestURL(requests, 'api/teams/',
                    _.extend(
                        {
                            topic_id: 'test_topic',
                            expand: 'user',
                            course_id: 'test/course/id',
                            order_by: '',
                            page: '1',
                            page_size: '10',
                            text_search: ''
                        },
                        options
                    ));
            };

            it('can search teams', function () {
                var requests = AjaxHelpers.requests(this),
                    teamsTabView = createTeamsTabView();
                teamsTabView.browseTopic('test_topic');
                verifyTeamsRequest(requests, {
                    order_by: 'name',
                    text_search: ''
                });
                AjaxHelpers.respondWithJson(requests, {});
                teamsTabView.$('.search-field').val('foo');
                teamsTabView.$('.action-search').click();
                verifyTeamsRequest(requests, {
                    order_by: '',
                    text_search: 'foo'
                });
                AjaxHelpers.respondWithJson(requests, {});
                expect(teamsTabView.$('.page-title').text()).toBe('Search Topic: test topic');
                expect(teamsTabView.$('.page-description').text()).toBe('Showing results for "foo"');
            });

            it('can clear a search', function () {
                var requests = AjaxHelpers.requests(this),
                    teamsTabView = createTeamsTabView();
                teamsTabView.browseTopic('test_topic');
                AjaxHelpers.respondWithJson(requests, {});

                // Perform a search
                teamsTabView.$('.search-field').val('foo');
                teamsTabView.$('.action-search').click();
                AjaxHelpers.respondWithJson(requests, {});

                // Clear the search and submit it again
                teamsTabView.$('.search-field').val('');
                teamsTabView.$('.action-search').click();
                verifyTeamsRequest(requests, {
                    order_by: 'name',
                    text_search: ''
                });
                AjaxHelpers.respondWithJson(requests, {});
                expect(teamsTabView.$('.page-title').text()).toBe('test topic');
                expect(teamsTabView.$('.page-description').text()).toBe('test description');
            });

            it('clears the search when navigating away and then back', function () {
                var requests = AjaxHelpers.requests(this),
                    teamsTabView = createTeamsTabView();
                teamsTabView.browseTopic('test_topic');
                AjaxHelpers.respondWithJson(requests, {});

                // Perform a search
                teamsTabView.$('.search-field').val('foo');
                teamsTabView.$('.action-search').click();
                AjaxHelpers.respondWithJson(requests, {});

                // Navigate to the "My Teams" tab
                teamsTabView.goToTab('my-teams');
                AjaxHelpers.respondWithJson(requests, {});

                // Navigate back to the teams list
                teamsTabView.browseTopic('test_topic');
                verifyTeamsRequest(requests, {
                    order_by: 'name',
                    text_search: ''
                });
                AjaxHelpers.respondWithJson(requests, {});
                expect(teamsTabView.$('.page-title').text()).toBe('test topic');
                expect(teamsTabView.$('.page-description').text()).toBe('test description');
            });
        });
    });
});
