import React, { useContext, useState } from "react";
import getConfig from "next/config";
import { useRouter } from "next/router";
import jwt from "jsonwebtoken";
import SEO from "../../components/SEO";
import Text from "../../components/Text";
import Input from "../../components/Input";
import Button from "../../components/Button";
import Box from "../../components/Box";
import Infobox from "../../components/Infobox";
import { withAuthServerSideProps } from "../../utils/withAuth";
import { NotificationContext } from "../../components/Notifications";
import LoadingContext from "../../utils/LoadingContext";
import MarkdownBody from "../../components/MarkdownBody";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

export const WikiFields = ({ values }) => {
  const [slugValue, setSlugValue] = useState(values?.slug);
  const [bodyValue, setBodyValue] = useState(values?.body);

  const {
    publicRuntimeConfig: { SQ_BASE_URL },
  } = getConfig();

  return (
    <>
      <Input
        name="slug"
        label="Path"
        value={slugValue}
        onChange={(e) => setSlugValue(e.target.value)}
        disabled={values?.slug === "/"}
        mb={2}
        required
      />
      <Text color="grey" fontSize={0} mb={4}>
        Page will be visible at {SQ_BASE_URL}/wiki{slugValue}
      </Text>
      <Input
        name="title"
        label="Title"
        defaultValue={values?.title}
        mb={4}
        required
      />
      <Input
        name="body"
        label="Body"
        placeholder="Markdown supported"
        value={bodyValue}
        onChange={(e) => setBodyValue(e.target.value)}
        rows={20}
        mb={4}
        required
      />
      <Box as="details" mb={4}>
        <Box as="summary">
          <Text
            as="span"
            fontWeight={600}
            fontSize={1}
            _css={{ textTransform: "uppercase" }}
          >
            Preview
          </Text>
        </Box>
        <Infobox mt={3}>
          <MarkdownBody>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a({ href, ...props }) {
                  return href.startsWith("http") ? (
                    <a href={href} target="_blank" {...props} />
                  ) : (
                    <Link href={href} passHref>
                      <a {...props} />
                    </Link>
                  );
                },
              }}
            >
              {bodyValue}
            </ReactMarkdown>
          </MarkdownBody>
        </Infobox>
      </Box>
    </>
  );
};

const NewWiki = ({ token, userRole }) => {
  if (userRole !== "admin") {
    return <Text>You do not have permission to do that.</Text>;
  }

  const { addNotification } = useContext(NotificationContext);
  const { setLoading } = useContext(LoadingContext);

  const router = useRouter();

  const {
    publicRuntimeConfig: { SQ_API_URL },
  } = getConfig();

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.target);

    try {
      const createWikiRes = await fetch(`${SQ_API_URL}/wiki/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: form.get("slug"),
          title: form.get("title"),
          body: form.get("body"),
        }),
      });

      if (createWikiRes.status !== 200) {
        const reason = await createWikiRes.text();
        throw new Error(reason);
      }

      addNotification("success", "Wiki page created successfully");

      const slug = await createWikiRes.text();
      router.push(`/wiki/${slug}`);
    } catch (e) {
      addNotification("error", `Could not create wiki page: ${e.message}`);
      console.error(e);
    }

    setLoading(false);
  };

  return (
    <>
      <SEO title="New wiki page" />
      <Text as="h1" mb={5}>
        New wiki page
      </Text>
      <form onSubmit={handleCreate}>
        <WikiFields />
        <Button display="block" ml="auto">
          Create wiki page
        </Button>
      </form>
    </>
  );
};

export const getServerSideProps = withAuthServerSideProps(async ({ token }) => {
  if (!token) return { props: {} };

  const {
    serverRuntimeConfig: { SQ_JWT_SECRET },
  } = getConfig();

  const { role } = jwt.verify(token, SQ_JWT_SECRET);

  return { props: { token, userRole: role } };
});

export default NewWiki;
