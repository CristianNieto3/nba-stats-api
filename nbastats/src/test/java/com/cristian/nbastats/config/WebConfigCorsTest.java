package com.cristian.nbastats.config;

import com.cristian.nbastats.player.PlayerController;
import com.cristian.nbastats.player.PlayerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
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
@TestPropertySource(properties =
        "app.cors.allowed-origins=https://nba-stats-hub.vercel.app,https://nba-stats-hub-*.vercel.app")
class WebConfigCorsTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PlayerService playerService;

    @Test
    void allowsTheProductionOrigin() throws Exception {
        preflightFrom("https://nba-stats-hub.vercel.app")
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://nba-stats-hub.vercel.app"));
    }

    @Test
    void allowsAPreviewDeployOrigin() throws Exception {
        preflightFrom("https://nba-stats-hub-git-feature-branch.vercel.app")
                .andExpect(status().isOk())
                .andExpect(header().string(
                        "Access-Control-Allow-Origin", "https://nba-stats-hub-git-feature-branch.vercel.app"));
    }

    /**
     * The wildcard is anchored to this project's subdomain prefix; someone
     * else's Vercel site must not inherit access to the API.
     */
    @Test
    void rejectsAnotherVercelSite() throws Exception {
        preflightFrom("https://somebody-elses-app.vercel.app").andExpect(status().isForbidden());
    }

    @Test
    void rejectsAnUnrelatedOrigin() throws Exception {
        preflightFrom("https://evil.example.com").andExpect(status().isForbidden());
    }

    private org.springframework.test.web.servlet.ResultActions preflightFrom(String origin) throws Exception {
        return mockMvc.perform(options("/api/v1/players")
                .header("Origin", origin)
                .header("Access-Control-Request-Method", "GET"));
    }
}
