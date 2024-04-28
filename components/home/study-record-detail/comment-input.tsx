import { Pressable, Text } from "react-native";
import React, { FC, useEffect, useMemo, useRef, useState } from "react";
import { Input, Spinner, View } from "tamagui";
import { Plane, Send, Smile } from "@tamagui/lucide-icons";
import {
  MentionInput,
  MentionSuggestionsProps,
  PartType,
  Suggestion,
} from "react-native-controlled-mentions";
import { Comment, Profile } from "@/types/supabase-util-types";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/lib/supabase";
import {
  TouchableHighlight,
  TouchableOpacity,
} from "react-native-gesture-handler";
import { mentionRegEx } from "react-native-controlled-mentions";
import { useGlobalSearchParams } from "expo-router";
import { useToastController } from "@tamagui/toast";
import { useStudyRecordDetails } from "@/hooks/modal/study-record/useStudyRecordDetails";
import { useCommentControl } from "@/hooks/modal/study-record/useCommentControls";
export default function CommentInput({
  reply_comment_id,
  profiles,
}: {
  reply_comment_id?: string;
  profiles?: Profile;
}) {
  const { id } = useGlobalSearchParams();
  const [value, setValue] = useState(() => {
    if (profiles) {
      return `@[${profiles.first_name} ${profiles.last_name}](${profiles.id})`;
    }
    return "";
  });
  const ref = useRef();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const { userDetails } = useAuth();
  const { data: details } = useStudyRecordDetails();
  const { comments, setComments } = useCommentControl();

  useEffect(() => {
    (async () => {
      if (!userDetails?.id || !details) return;
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id,first_name,last_name")
        .neq("id", userDetails.id)
        .neq("id", details.user_id);
      if (error || !profiles) return console.log(error);

      const tmp = profiles.map((profile) => ({
        id: profile.id,
        name: `${profile.last_name} ${profile.first_name}`,
      }));

      setSuggestions(tmp);
    })();
  }, [userDetails?.id]);

  const renderSuggestions = ({
    keyword,
    onSuggestionPress,
  }: MentionSuggestionsProps) => {
    if (keyword == null) {
      return null;
    }

    return (
      <View
        position="absolute"
        bottom={"$8"}
        backgroundColor={"$color2"}
        borderWidth="$0.5"
        borderColor={"$color6"}
        borderRadius={"$5"}
      >
        {suggestions.length > 0 ? (
          suggestions
            .filter((one) =>
              one.name.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
            )
            .map((one) => (
              <Pressable
                key={one.id}
                onPress={() => onSuggestionPress(one)}
                style={{ padding: 12 }}
              >
                <Text>{one.name}</Text>
              </Pressable>
            ))
        ) : (
          <Spinner scale={1} size="large" color="$green10" />
        )}
      </View>
    );
  };
  const toast = useToastController();
  const handleComment = async () => {
    if (!value || !id || !userDetails?.id || !details) return;
    //extract mentions id from value

    setValue("");

    const { data, error } = await supabase
      .from("comments")
      .insert({
        content: value,
        study_record_id: id as string,
        reply_comment_id: reply_comment_id || null,
        user_id: userDetails.id,
      })
      .select("*,profiles(id,avatar,first_name,last_name),likes(count)")
      .single();
    if (error) {
      return toast.show("Error!!", {
        message: error.message,
        native: false,
      });
    }

    const newComment = comments;
    newComment.unshift(data as Comment);

    setComments(newComment);
    //send notification to the user

    const mentions = value.match(mentionRegEx);
    if (mentions) {
      //get all the id from the mentions
      const ids = mentions.map((mention) => {
        const id = new RegExp(mentionRegEx).exec(mention);
        return id ? id[4] : "";
      });
      //filter out the id empty
      const filteredIds = ids.filter((id) => id !== "");
      const { data: notification, error: notiError } = await supabase
        .from("notification")
        .insert(
          (filteredIds as string[]).map((id) => ({
            receiver_id: id,
            sender_id: userDetails.id,
            content: `${userDetails?.first_name} ${userDetails?.last_name} has mentioned you on a post`,
            link_to: `/study-record/${details.id}`,
            meta_data: {
              avatar: userDetails?.avatar,
            },
          }))
        );
      if (notiError) {
        return toast.show("Error!!", {
          message: notiError.message,
          native: false,
        });
      }
    } else {
      if (details.user_id !== userDetails.id) {
        const { data: notification, error: notiError } = await supabase
          .from("notification")
          .insert({
            receiver_id: details.user_id,
            sender_id: userDetails.id,
            content: `${userDetails?.first_name} ${userDetails?.last_name} has commented on your post`,
            link_to: `/study-record/${details.id}`,
            meta_data: {
              avatar: userDetails?.avatar,
            },
          });
        if (notiError) {
          return toast.show("Error!!", {
            message: notiError.message,
            native: false,
          });
        }
      }
    }
  };
  return (
    <View mt="$3">
      <View
        width={"100%"}
        justifyContent="center"
        columnGap="$2"
        pr="$2"
        alignItems="center"
        flexDirection="row"
      >
        {/* <Input placeholder="Type something..." flex={1} /> */}
        <MentionInput
          value={value}
          onChange={setValue}
          placeholder="Type something..."
          containerStyle={{
            borderWidth: 1,
            flex: 1,
            padding: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderColor: "rgb(180, 223, 196)",
            backgroundColor: "rgb(242, 252, 245)",
          }}
          partTypes={[
            {
              trigger: "@", // Should be a single character like '@' or '#'
              renderSuggestions,
              textStyle: { fontWeight: "bold", color: "rgb(48, 164, 108)" }, // The mention style in the input
            },
          ]}
        />
        <TouchableOpacity onPress={handleComment}>
          <Send />
        </TouchableOpacity>
      </View>
    </View>
  );
}
