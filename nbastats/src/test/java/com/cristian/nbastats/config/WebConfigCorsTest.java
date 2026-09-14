package com.cristian.nbastats.config;

import com.cristian.nbastats.player.PlayerController;
import com.cristian.nbastats.player.PlayerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The deployed frontend can only reach the API if its origin survives the
 * preflight, so the origin matching is pinned down here rather than discovered
 * from a browser console after a release.
 */
@WebMvcTest(controllers = PlayerController.class)
@Import({WebConfig.class, SecurityConfig.class})
@TestPropertySource(properties = "app.cors.allowed-origins="
        + "https://nba-stats-hub-six.vercel.app,"
        + "https://nba-stats-*-cristiannieto3s-projects.vercel.app")
class WebConfigCorsTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PlayerService playerService;

    @Test
    void allowsTheProductionOrigin() throws Exception {
        allows("https://nba-stats-hub-six.vercel.app");
    }

    /**
     * Preview URLs come in two shapes, per-commit and per-branch, and the host
     * truncates a long project name in the first: the deployment that created
     * this project was served from nba-stats-6lfjs01lz-..., not
     * nba-stats-hub-6lfjs01lz-.... A pattern anchored on the full project name
     * would miss those, so the wildcard sits directly after nba-stats.
     */
    @Test
    void allowsAPerCommitPreviewOrigin() throws Exception {
        allows("https://nba-stats-6lfjs01lz-cristiannieto3s-projects.vercel.app");
    }

    @Test
    void allowsAPerBranchPreviewOrigin() throws Exception {
        allows("https://nba-stats-hub-git-feature-branch-cristiannieto3s-projects.vercel.app");
    }

    /**
     * The wildcard is bounded on both sides, by the nba-stats prefix and by the
     * team slug; someone else's Vercel site must not inherit access to the API.
     */
    @Test
    void rejectsAnotherVercelSite() throws Exception {
        preflightFrom("https://somebody-elses-app.vercel.app").andExpect(status().isForbidden());
    }

    /**
     * The prefix alone is not enough. Vercel subdomains are globally shared and
     * nba-stats-hub.vercel.app already belongs to a stranger, so a pattern that
     * stopped at the prefix would hand them the API.
     */
    @Test
    void rejectsAStrangersProjectSharingThePrefix() throws Exception {
        preflightFrom("https://nba-stats-hub.vercel.app").andExpect(status().isForbidden());
    }

    /**
     * nba-stats-explorer.vercel.app was the intended vanity origin, but the
     * subdomain is registered to another Vercel account and cannot be claimed,
     * so it must not stay in the allowlist: whoever owns it could otherwise
     * deploy a page that calls this API from a browser.
     */
    @Test
    void rejectsTheVanityOriginThatBelongsToAnotherAccount() throws Exception {
        preflightFrom("https://nba-stats-explorer.vercel.app").andExpect(status().isForbidden());
    }

    @Test
    void rejectsAnUnrelatedOrigin() throws Exception {
        preflightFrom("https://evil.example.com").andExpect(status().isForbidden());
    }

    private void allows(String origin) throws Exception {
        preflightFrom(origin)
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", origin));
    }

    private org.springframework.test.web.servlet.ResultActions preflightFrom(String origin) throws Exception {
        return mockMvc.perform(options("/api/v1/players")
                .header("Origin", origin)
                .header("Access-Control-Request-Method", "GET"));
    }
}
