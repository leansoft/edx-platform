define([
    'backbone', 'underscore', 'teams/js/collections/topic', 'teams/js/views/topics',
    'teams/js/spec_helpers/team_spec_helpers', 'common/js/spec_helpers/ajax_helpers'
], function (Backbone, _, TopicCollection, TopicsView, TeamSpecHelpers, AjaxHelpers) {
    'use strict';
    describe('TopicsView', function () {
        var initialTopics, topicCollection, createTopicsView, triggerUpdateEvent;

        createTopicsView = function() {
            return new TopicsView({
                teamEvents: TeamSpecHelpers.teamEvents,
                el: '.topics-container',
                collection: topicCollection
            }).render();
        };

        triggerUpdateEvent = function(topicsView, sendJoinAfter) {
            topicsView.collection.teamEvents.trigger('teams:update', { action: 'create' });
            if (sendJoinAfter) {
                topicsView.collection.teamEvents.trigger('teams:update', { action: 'join' });
            }
            topicsView.render();
        };

        beforeEach(function () {
            setFixtures('<div class="topics-container"></div>');
            initialTopics = TeamSpecHelpers.createMockTopicData(1, 5);
            topicCollection = TeamSpecHelpers.createMockTopicCollection(initialTopics);
        });

        it('can render the first of many pages', function () {
            var topicsView = createTopicsView(),
                footerEl = topicsView.$('.topics-paging-footer'),
                topicCards = topicsView.$('.topic-card');
            expect(topicsView.$('.topics-paging-header').text()).toMatch('Showing 1-5 out of 6 total');
            _.each(initialTopics, function (topic, index) {
                var currentCard = topicCards.eq(index);
                expect(currentCard.text()).toMatch(topic.name);
                expect(currentCard.text()).toMatch(topic.description);
                expect(currentCard.text()).toMatch(topic.team_count + ' Teams');
            });
            expect(footerEl.text()).toMatch('1\\s+out of\\s+\/\\s+2');
            expect(footerEl).not.toHaveClass('hidden');
        });

        it('refreshes the topics when a team is created', function() {
            var requests = AjaxHelpers.requests(this),
                topicsView = createTopicsView();

            triggerUpdateEvent(topicsView);
            AjaxHelpers.expectJsonRequestURL(
                requests,
                'api/teams/topics',
                {
                    course_id : 'my/course/id',
                    page : '1',
                    page_size : '5',  // currently the page size is determined by the size of the collection
                    order_by : 'name'
                }
            );
        });

        it('refreshes the topics staff creates a team and then joins it', function() {
            var requests = AjaxHelpers.requests(this),
                topicsView = createTopicsView();

            // Staff are not immediately added to the team, but may choose to join after the create event.
            triggerUpdateEvent(topicsView, true);
            AjaxHelpers.expectJsonRequestURL(
                requests,
                'api/teams/topics',
                {
                    course_id : 'my/course/id',
                    page : '1',
                    page_size : '5',  // currently the page size is determined by the size of the collection
                    order_by : 'name'
                }
            );
        });
    });
});
