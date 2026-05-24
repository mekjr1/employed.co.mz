from __future__ import annotations


def test_public_jobs_strips_contact_field(client, sample_job, sample_market_headers):
    sample_job()

    response = client.get("/api/jobs", headers=sample_market_headers("mz"))

    assert response.status_code == 200
    assert response.json()["items"][0]["contact"] is None


def test_public_featured_jobs_returns_only_featured_jobs(client, job_factory, sample_market_headers):
    featured = job_factory(title="Featured API Job", featured=True)
    job_factory(title="Regular API Job", featured=False)

    response = client.get("/api/featuredJobs", headers=sample_market_headers("mz"))

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [featured.id]
    assert response.json()[0]["contact"] is None


def test_public_jobs_supports_page_and_page_size(client, job_factory, sample_market_headers):
    for index in range(5):
        job_factory(title=f"Public Role {index}")

    response = client.get("/api/jobs?page=2&page_size=2", headers=sample_market_headers("mz"))

    assert response.status_code == 200
    body = response.json()
    assert body["page"] == 2
    assert body["page_size"] == 2
    assert len(body["items"]) == 2


def test_public_jobs_include_site_url_and_rate_limit(client, sample_job, sample_market_headers):
    sample_job(title="Rate Limited Job")
    headers = sample_market_headers("mz")

    first = client.get("/api/jobs", headers=headers)
    for _ in range(59):
        client.get("/api/jobs", headers=headers)
    limited = client.get("/api/jobs", headers=headers)

    assert first.status_code == 200
    assert first.json()["items"][0]["site_url"].endswith("/rate-limited-job")
    assert limited.status_code == 429
